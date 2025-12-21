import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTableNames } from '@/lib/table-config';
import { Comment } from '@/types/comment';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

interface DirectorRequest {
  post_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DirectorRequest = await request.json();
    
    if (!body.post_id) {
      return NextResponse.json(
        { success: false, message: 'post_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const tableNames = getTableNames();

    // 1. 현재 포스트의 댓글 상황 분석
    const { data: existingComments, error: commentError } = await supabase
      .from(tableNames.comments)
      .select('*')
      .eq('post_id', body.post_id)
      .order('created_at', { ascending: true });

    if (commentError) {
      throw new Error(`댓글 조회 실패: ${commentError.message}`);
    }

    // 2. 블로그에서 포스트 본문 가져오기
    let postContent: string;
    try {
      postContent = await fetchPostContent(body.post_id);
    } catch (error) {
      console.error('포스트 본문 가져오기 실패:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: '포스트 본문을 가져올 수 없어 댓글을 생성할 수 없습니다.' 
        },
        { status: 500 }
      );
    }

    // 3. 포스트 언어 추출 (URL에서)
    const postLanguage = body.post_id.startsWith('ko/') ? 'ko' : 'ja';

    // 4. AI가 모든 것을 한 번에 처리 (봇 선택 + 댓글 생성)
    const aiResult = await generateCommentWithSmartAI(
      tableNames,
      body.post_id,
      postContent,
      existingComments || [],
      postLanguage
    );

    if (!aiResult) {
      return NextResponse.json(
        { success: false, message: 'AI 댓글 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI가 봇을 선택하고 댓글을 생성했습니다.',
      data: {
        selected_bot: {
          id: aiResult.selectedPersona.id,
          nickname: aiResult.selectedPersona.nickname,
          name: aiResult.selectedPersona.name,
          selection_reason: aiResult.selectionReason,
          replyTargetId: aiResult.replyTargetId || null,
          replyTargetNickname: aiResult.replyTargetNickname || null
        },
        generated_comment: aiResult.savedComment,
        available_personas: aiResult.availablePersonas
      }
    });

  } catch (error) {
    console.error('AI 연출가 로직 실행 중 오류:', error);
    return NextResponse.json(
      { success: false, message: 'AI 연출가 로직 실행에 실패했습니다.' },
      { status: 500 }
    );
  }
}









// 블로그에서 포스트 본문 가져오기
async function fetchPostContent(postId: string): Promise<string> {
  try {
    // 1. 로컬/운영 환경에 맞는 URL 구성
    let actualUrl: string;
    if (process.env.NODE_ENV === 'development') {
      // 로컬: http://localhost:3000/blog/ko/weekly/250823/
      actualUrl = `http://localhost:3000/blog/${postId}/`;
    } else {
      // 운영: https://mintora.me/blog/ko/weekly/250823/
      actualUrl = `https://mintora.me/blog/${postId}/`;
    }
    
    console.log(`포스트 URL: ${actualUrl}`);
    
    // 2. 포스트 내용 가져오기
    const response = await fetch(actualUrl);
    if (!response.ok) {
      throw new Error(`포스트 조회 실패: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 3. HTML에서 본문 내용 추출 (정확한 파싱)
    // <article> 태그에서 comment-section을 제외한 내용만 추출
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    
    if (!articleMatch) {
      throw new Error('포스트 본문을 찾을 수 없습니다 (<article> 태그 없음)');
    }
    
    let articleContent = articleMatch[1];
    
    // comment-section 제거 (댓글 영역 제외)
    articleContent = articleContent.replace(/<div[^>]*class="[^"]*comment-section[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // 4. HTML 태그 제거하고 텍스트만 추출
    const textContent = articleContent
      .replace(/<[^>]*>/g, ' ')  // HTML 태그 제거
      .replace(/\s+/g, ' ')      // 연속된 공백을 하나로
      .trim();
    
    console.log(`추출된 본문 길이: ${textContent.length}자`);
    console.log(`본문 미리보기: ${textContent.substring(0, 100)}...`);
    
    if (!textContent || textContent.trim().length === 0) {
      throw new Error('포스트 본문이 비어있습니다.');
    }
    
    return textContent;
    
  } catch (error) {
    console.error('포스트 본문 가져오기 실패:', error);
    throw error; // 에러를 상위로 전파하여 처리
  }
}

// 대화 구조 분석 함수
function analyzeConversationStructure(comments: Comment[]): string {
  if (comments.length === 0) {
    return '새로운 포스트입니다. 첫 댓글을 작성할 차례입니다.';
  }

  const parentComments = comments.filter(c => !c.parent_id);
  const replyComments = comments.filter(c => c.parent_id);
  const maxDepth = Math.max(...comments.map(c => {
    let depth = 0;
    let current = c;
    while (current.parent_id) {
      depth++;
      current = comments.find(cc => cc.id === current.parent_id) || current;
      if (depth > 10) break; // 무한 루프 방지
    }
    return depth;
  }));

  let analysis = `대화 현황: ${parentComments.length}개 메인 댓글, ${replyComments.length}개 대댓글\n`;
  analysis += `대화 깊이: 최대 ${maxDepth}단계\n`;

  if (replyComments.length > 0) {
    analysis += '대화가 활발하게 진행되고 있습니다. 적절한 대댓글이나 새로운 관점의 댓글이 도움이 될 수 있습니다.\n';
  } else if (parentComments.length >= 2) {
    analysis += '여러 메인 댓글이 있지만 대화가 깊어지지 않았습니다. 대화를 이끌어갈 수 있는 댓글이 필요합니다.\n';
  } else {
    analysis += '아직 대화 초기 단계입니다. 포스트 내용에 대한 다양한 관점의 댓글이 도움이 될 수 있습니다.\n';
  }

  return analysis;
}

// AI가 모든 것을 한 번에 처리하는 함수
async function generateCommentWithSmartAI(
  tableNames: ReturnType<typeof getTableNames>,
  postId: string,
  postContent: string,
  existingComments: Comment[],
  postLanguage: 'ko' | 'ja'
): Promise<{
  selectedPersona: {
    id: string;
    name: string;
    nickname: string;
    lang: string;
    system_prompt: string;
    avatar: string;
    is_active: boolean;
  };
  savedComment: Comment;
  selectionReason: string;
  replyTargetId: string | null;
  replyTargetNickname: string | null;
  availablePersonas: Array<{
    name: string;
    nickname: string;
    lang: string;
  }>;
} | null> {
  try {
    // 1. 포스트 언어에 맞는 봇 페르소나 조회
    const { data: personas, error: personaError } = await supabase
      .from(tableNames.botPersonas)
      .select('*')
      .eq('lang', postLanguage)
      .eq('is_active', true);

    if (personaError || !personas || personas.length === 0) {
      throw new Error(`해당 언어(${postLanguage})의 봇 페르소나를 찾을 수 없습니다.`);
    }

    // 2. AI에게 모든 정보를 전달하여 봇 선택과 댓글 생성을 한 번에 처리
    const prompt = `
당신은 블로그 포스트에 댓글을 달 AI 페르소나입니다.

## 상황 정보
포스트 ID: ${postId}
포스트 언어: ${postLanguage}

포스트 본문:
${postContent}

전체 댓글들:
${existingComments.map(c => `- ID: ${c.id} | ${c.author_name} (${c.is_bot ? 'AI봇' : '사람'})${c.parent_id ? ' [대댓글]' : ''}: ${c.content}`).join('\n')}

대화 통계: 총 ${existingComments.length}개 댓글

## 대화 구조 분석
${analyzeConversationStructure(existingComments)}

## 선택 가능한 페르소나들 (${postLanguage} 언어)
${personas.map((p, index) => `${index + 1}. ${p.nickname}: ${p.system_prompt}`).join('\n\n')}

## 💡 자연스러운 대화를 위한 가이드

**자기 인식 및 맥락 유지**:
- 이미 댓글을 작성한 페르소나라면, 이전 댓글과 연결되는 맥락으로 작성하는 것이 자연스럽습니다.
- 하지만 너무 강제적으로 연결하려 하지 말고, 자연스러운 흐름으로 이어가세요.
- 다른 봇이나 사람의 의견에 자연스럽게 반응하며, 토론의 흐름을 이어가세요.

**토론 심화 가이드 (Guide to Deepening Discussion)**:

대화의 흐름과 맥락에 따라, 다음과 같은 단계별로 토론의 수위를 조절하세요.

**Level 1: 정중한 반박 (Polite Rebuttal)**
- **상황**: 토론의 첫 반박이 시작될 때.
- **지시**: 존댓말을 유지하세요. 상대방의 의견을 존중하면서, "흥미로운 의견입니다만, 혹시 ~~한 경우는 어떨까요?" 와 같이 질문의 형태로 다른 관점을 제시하세요.

**Level 2: 직설적인 지적 (Direct Critique)**
- **상황**: 대댓글이 1개 이상 오가며 토론이 구체화될 때.
- **지시**: 이제 반말을 섞어 사용할 수 있습니다. 만약 당신이 '반말로 작성된 댓글'에 대댓글을 다는 경우, 당신의 기본 말투가 존댓말이더라도, 그에 맞춰 당신도 자연스럽게 반말을 섞어 사용할 수 있습니다. 상대방 주장의 논리적 허점이나 기술적인 약점을 직접적으로 지적하세요. (예: "그건 이론상이고, 실제로는 ~~한 문제가 생겨.", "그 방법은 성능 이슈가 있을 텐데.")

**Level 3: 공격적인 논쟁 (Aggressive Debate)**
- **상황**: 토론이 4개 이상의 댓글로 이어지며 과열될 때.
- **지시**: 더 과감한 표현을 사용하세요. 상대방의 지식이나 경험에 의문을 제기하는 수사적인 질문을 던질 수 있습니다. (예: "혹시 실무 경험 없으신가요? 이론이랑 현실은 다릅니다.", "~~라고 하셨는데, 그건 기본도 모르는 소리야.")

**[매우 중요한 공통 규칙]**
- **절대 인신공격이나 욕설은 사용하지 마세요.**
- **모든 비판과 공격은 반드시 '기술적인 사실'과 '논리'에 기반해야 합니다.**

**## 댓글 생성 수량 규칙**

1. **기본 규칙:** 봇 댓글의 총합은 **10개**를 목표로 합니다.

2. **자율적 연장:** 만약 현재 봇 댓글 수가 **9개 이상**이고, **아래 조건 중 하나라도 만족**하면 댓글 생성을 계속할 수 있습니다.
- 아직 토론의 결론이 명확하게 나지 않았다고 판단될 경우
- 새로운 관점이나 반박할 만한 내용이 남아있다고 판단될 경우
- 진짜 사람의 참여로 인해 대화가 다시 활성화되었을 경우

3. **강제 종료:** 어떤 경우에도 봇 댓글의 총합은 **20개**를 넘을 수 없습니다. 20개가 되면, 더 이상 새로운 댓글을 생성하지 마세요.

**연속성 표현 예시 (선택사항)**:
- "앞서 언급했던...", "제가 좋아했던...", "이전에 우려했던..."
- 자연스럽게 떠오르는 표현을 사용하세요.

**댓글 타입 결정 규칙**:
- **reply**: 특정 댓글에 직접 반응하는 경우 (예: @Heisenbug, @특이점은온다)
- **new_comment**: 포스트 내용에 대한 새로운 관점이나 기존 댓글과 연결되는 새로운 아이디어

**대댓글 판단 기준 (중요!)**:
- 댓글 내용이 @[사용자명]으로 시작하면 → **반드시 reply**
- 특정 사용자의 의견에 대한 반응이면 → **반드시 reply**
- 포스트 내용에 대한 독립적인 의견이면 → **new_comment**

**핵심 규칙**: @[사용자명]으로 시작하는 댓글은 100% reply입니다!

**대댓글 작성 시**:
- 멘션 형식: @[사용자명] (예: @특이점은온다)
- 원문 내용을 그대로 인용하지 말고, 핵심 관점만 언급
- 그 댓글의 의견에 대한 자신의 견해를 제시
- 자연스러운 대화 흐름으로 연결

**중요**: 마크다운 형식(**강조**, *기울임* 등)을 사용하지 마세요. 댓글 시스템에서 지원하지 않아 **와 * 문자가 그대로 노출됩니다.

댓글은 800자 이내로, 자연스럽고 블로그 댓글다운 톤으로 작성해주세요.

답변 형식:
선택된 페르소나: [페르소나명]
선택 이유: [왜 이 페르소나를 선택했는지]
댓글 타입: [new_comment 또는 reply - @[사용자명]으로 시작하면 반드시 reply]
대댓글 대상 ID: [reply인 경우 반응할 댓글의 ID (UUID), new_comment인 경우 비워두기]
대댓글 대상 닉네임: [reply인 경우 반응할 댓글의 작성자 닉네임, new_comment인 경우 비워두기]
댓글: [실제 댓글 내용]
`;

    // 3. Gemini API 호출 (새로운 SDK 사용)
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('Gemini API 응답에서 텍스트를 추출할 수 없습니다.');
    }

    // 4. AI 응답 파싱
    const lines = generatedText.split('\n');

    let selectedPersonaName = '';
    let selectionReason = '';
    let commentType = 'new_comment';
    let replyTargetId = null;        // UUID (DB 연결용)
    let replyTargetNickname = null;  // 닉네임 (표시용)
    let comment = '';

    // 각 필드 추출
    for (const line of lines) {
      if (line.startsWith('선택된 페르소나:') && !selectedPersonaName) {
        selectedPersonaName = line.replace('선택된 페르소나:', '').trim();
      } else if (line.startsWith('선택 이유:') && !selectionReason) {
        selectionReason = line.replace('선택 이유:', '').trim();
      } else if (line.startsWith('댓글 타입:')) {
        const extractedType = line.replace('댓글 타입:', '').trim();
        commentType = extractedType;
      } else if (line.startsWith('대댓글 대상 ID:') && !replyTargetId) {
        const target = line.replace('대댓글 대상 ID:', '').trim();
        replyTargetId = target && target !== '비워두기' ? target : null;
      } else if (line.startsWith('대댓글 대상 닉네임:') && !replyTargetNickname) {
        const nickname = line.replace('대댓글 대상 닉네임:', '').trim();
        replyTargetNickname = nickname && nickname !== '비워두기' ? nickname : null;
      }
    }

    // 댓글은 "댓글:" 다음부터 끝까지 모든 내용을 가져오기
    const commentStartIndex = lines.findIndex((line: string) => line.startsWith('댓글:'));

    if (commentStartIndex !== -1) {
      const commentLine = lines[commentStartIndex];

      // "댓글:" 다음 내용 추출 (같은 줄에 있을 수 있음)
      if (commentLine.includes('댓글:')) {
        comment = commentLine.split('댓글:')[1].trim();
      }

      // 만약 같은 줄에 댓글이 없으면 다음 줄들 확인
      if (!comment || comment.length === 0) {
        const commentLines = lines.slice(commentStartIndex + 1);
        comment = commentLines.join('\n').trim();
      }
    }

    // 중요 정보 로그 (모니터링용)
    console.log('AI 봇 선택 결과:');
    console.log('- 선택된 페르소나:', selectedPersonaName);
    console.log('- 댓글 타입:', commentType);
    console.log('- 대댓글 대상 ID (UUID):', replyTargetId || '없음');
    console.log('- 대댓글 대상 닉네임:', replyTargetNickname || '없음');
    console.log('- 생성된 댓글 길이:', comment.length, '자');
    console.log('- 생성된 댓글 미리보기:', comment.substring(0, 100) + (comment.length > 100 ? '...' : ''));

    // 5. 선택된 페르소나 찾기
    const selectedPersona = personas.find((p) => p.nickname === selectedPersonaName);
    if (!selectedPersona) {
      throw new Error(`선택된 페르소나를 찾을 수 없습니다: ${selectedPersonaName}`);
    }

    if (!comment || comment.trim().length === 0) {
      throw new Error('생성된 댓글이 비어있습니다.');
    }

    // 6. 생성된 댓글을 데이터베이스에 저장
    const { data: savedComment, error: saveError } = await supabase
      .from(tableNames.comments)
      .insert({
        id: uuidv4(),
        content: comment.trim(),
        author_name: selectedPersona.nickname,
        author_avatar: selectedPersona.avatar,
        is_bot: true,
        parent_id: commentType === 'reply' && replyTargetId ? await getTopLevelParentId(tableNames, replyTargetId) : null,
        post_id: postId
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`댓글 저장 실패: ${saveError.message}`);
    }

    // 7. 추가 댓글 예약 (대화 활성화를 위해)
    await scheduleNextComment(tableNames, postId, existingComments.length + 1);

    return {
      selectedPersona,
      savedComment,
      selectionReason,
      replyTargetId,
      replyTargetNickname,
      availablePersonas: personas.map((p) => ({
        name: p.name,
        nickname: p.nickname,
        lang: p.lang
      }))
    };

  } catch (error) {
    console.error('AI 스마트 생성 에러:', error);
    return null;
  }
}

// 추가 댓글 예약 함수
async function scheduleNextComment(
  tableNames: ReturnType<typeof getTableNames>,
  postId: string,
  currentCommentCount: number
): Promise<void> {
  try {
    // 봇 댓글 수 제한 확인 (최대 20개)
    if (currentCommentCount >= 20) {
      console.log(`봇 댓글 수 제한에 도달: ${currentCommentCount}/20`);
      return;
    }

    // 기존 로직과 일관성 유지: 1분~2시간 랜덤 지연
    const delayMinutes = Math.floor(Math.random() * (120 - 1 + 1)) + 1; // 1~120분
    const delayMs = delayMinutes * 60 * 1000;
    const executionTime = new Date(Date.now() + delayMs);

    // scheduled_jobs에 추가 작업 예약
    const { error: scheduleError } = await supabase
      .from(tableNames.scheduledJobs || 'scheduled_jobs')
      .insert({
        id: crypto.randomUUID(),
        post_id: postId,
        url: `https://mintora.me/blog/${postId}`,
        execution_time: executionTime.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (scheduleError) {
      console.error('추가 댓글 예약 실패:', scheduleError);
    } else {
      console.log(`다음 댓글 예약 완료: ${delayMinutes}분 후 (${currentCommentCount + 1}번째)`);
    }

  } catch (error) {
    console.error('추가 댓글 예약 중 오류:', error);
  }
}

// 최상위 부모 댓글 ID를 찾는 함수
async function getTopLevelParentId(
  tableNames: ReturnType<typeof getTableNames>,
  commentId: string
): Promise<string> {
  try {
    let currentId = commentId;
    
    // 최상위 부모 댓글을 찾을 때까지 반복
    while (true) {
      const { data: comment, error } = await supabase
        .from(tableNames.comments)
        .select('parent_id')
        .eq('id', currentId)
        .single();
      
      if (error || !comment || !comment.parent_id) {
        // 더 이상 부모가 없으면 현재 ID가 최상위 부모
        return currentId;
      }
      
      // 부모가 있으면 계속 위로 올라감
      currentId = comment.parent_id;
    }
  } catch (error) {
    console.error('최상위 부모 ID 찾기 실패:', error);
    // 에러 발생 시 원래 ID 반환
    return commentId;
  }
}
