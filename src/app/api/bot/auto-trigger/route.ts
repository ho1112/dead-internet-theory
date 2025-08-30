import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTableNames } from '@/lib/table-config';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { post_id, trigger_type = 'webhook' } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        { success: false, message: 'post_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const tableNames = getTableNames();

    const botActivityInfo = await getBotActivityInfo(tableNames, post_id);

    // 3. AI 봇 디렉터 호출
    const aiResponse = await fetch(`${request.nextUrl.origin}/api/bot/director`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(`AI 봇 생성 실패: ${errorData.message}`);
    }

    const aiResult = await aiResponse.json();

    return NextResponse.json({
      success: true,
      message: '자동 봇 트리거가 성공적으로 실행되었습니다.',
              data: {
          trigger_type,
          post_id,
          bot_activity: botActivityInfo,
          ai_result: aiResult.data
        }
    });

  } catch (error) {
    console.error('자동 봇 트리거 오류:', error);
    return NextResponse.json(
      { success: false, message: `자동 봇 트리거 실패: ${error}` },
      { status: 500 }
    );
  }
}

// 봇 활동 정보 수집 (제한 없음)
async function getBotActivityInfo(
  tableNames: ReturnType<typeof getTableNames>,
  postId: string
): Promise<{
  limits: {
    totalComments: number;
    botComments: number;
  };
}> {
  try {
    // 해당 포스트의 전체 댓글 수 확인
    const { data: allComments, error: commentError } = await supabase
      .from(tableNames.comments)
      .select('*')
      .eq('post_id', postId);

    if (commentError) {
      throw new Error(`댓글 조회 실패: ${commentError.message}`);
    }

    const totalComments = allComments?.length || 0;
    const botComments = allComments?.filter(c => c.is_bot).length || 0;

    return {
      limits: {
        totalComments,
        botComments
      }
    };

  } catch (error) {
    console.error('봇 활동 정보 수집 오류:', error);
    return {
      limits: { totalComments: 0, botComments: 0 }
    };
  }
}
