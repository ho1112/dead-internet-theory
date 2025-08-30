import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTableNames } from '@/lib/table-config';
import { Comment } from '@/types/comment';
import { v4 as uuidv4 } from 'uuid';

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
          replyTargetId: aiResult.replyTargetId || null
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
당신은 블로그 포스트에 댓글을 달 AI 연출가이자 배우입니다.

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
${personas.map((p, index) => `${index + 1}. ${p.nickname} (${p.name}): ${p.system_prompt}`).join('\n\n')}

## 지시사항
이 상황을 분석하여:
1. 가장 적합한 페르소나를 선택하고
2. 그 페르소나의 성격과 말투로 맥락에 맞는 댓글을 작성하세요

**댓글 타입 결정 규칙**:
- **reply**: 특정 댓글에 직접 반응하는 경우 (예: @코드수리공님, @신기술너무좋아님)
- **new_comment**: 포스트 내용에 대한 새로운 관점이나 기존 댓글과 연결되는 새로운 아이디어

**대댓글 판단 기준 (중요!)**:
- 댓글 내용이 @[사용자명]으로 시작하면 → **반드시 reply**
- 특정 사용자의 의견에 대한 반응이면 → **반드시 reply**
- 포스트 내용에 대한 독립적인 의견이면 → **new_comment**

**핵심 규칙**: @[사용자명]으로 시작하는 댓글은 100% reply입니다!

**대댓글 작성 시**:
- 멘션 형식: @[사용자명] (예: @코드수리공님)
- 원문 내용을 그대로 인용하지 말고, 핵심 관점만 언급
- 그 댓글의 의견에 대한 자신의 견해를 제시
- 자연스러운 대화 흐름으로 연결

**중요**: 마크다운 형식(**강조**, *기울임* 등)을 사용하지 마세요. 댓글 시스템에서 지원하지 않아 **와 * 문자가 그대로 노출됩니다.

댓글은 1000자 이내로, 자연스럽고 블로그 댓글다운 톤으로 작성해주세요.

답변 형식:
선택된 페르소나: [페르소나명]
선택 이유: [왜 이 페르소나를 선택했는지]
댓글 타입: [new_comment 또는 reply - @[사용자명]으로 시작하면 반드시 reply]
대댓글 대상: [reply인 경우 반응할 댓글의 ID (UUID), new_comment인 경우 비워두기]
댓글: [실제 댓글 내용]
`;

    // 3. Gemini API 호출
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('Gemini API 응답에서 텍스트를 추출할 수 없습니다.');
    }



    // 4. AI 응답 파싱
    const lines = generatedText.split('\n');
    
    let selectedPersonaName = '';
    let selectionReason = '';
    let commentType = 'new_comment';
    let replyTargetId = null;
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
      } else if (line.startsWith('대댓글 대상:') && !replyTargetId) {
        const target = line.replace('대댓글 대상:', '').trim();
        replyTargetId = target && target !== '비워두기' ? target : null;
      }
    }
    
    // 댓글은 "댓글:" 다음부터 끝까지 모든 내용을 가져오기
    const commentStartIndex = lines.findIndex((line: string) => line.startsWith('댓글:'));
    if (commentStartIndex !== -1) {
      // "댓글:" 다음 줄부터 끝까지 모든 내용을 합치기
      const commentLines = lines.slice(commentStartIndex + 1);
      comment = commentLines.join('\n').trim();
    }
    

    
    // 중요 정보 로그 (모니터링용)
    console.log('AI 봇 선택 결과:');
    console.log('- 선택된 페르소나:', selectedPersonaName);
    console.log('- 댓글 타입:', commentType);
    console.log('- 대댓글 대상:', replyTargetId || '없음');
    console.log('- 생성된 댓글 길이:', comment.length, '자');

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
        parent_id: commentType === 'reply' && replyTargetId ? replyTargetId : null,
        post_id: postId
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`댓글 저장 실패: ${saveError.message}`);
    }

    return {
      selectedPersona,
      savedComment,
      selectionReason,
      replyTargetId,
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
