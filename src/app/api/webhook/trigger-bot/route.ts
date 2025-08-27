import { NextRequest, NextResponse } from 'next/server';

interface NewPostWebhook {
  post_id: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NewPostWebhook = await request.json();
    
    // 입력 검증
    if (!body.post_id || !body.url) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'post_id와 url이 필요합니다.' 
        },
        { status: 400 }
      );
    }

    console.log('🚀 새 포스트 감지!');
    console.log('📝 Post ID:', body.post_id);
    console.log('🔗 URL:', body.url);
    console.log('⏰ 시간:', new Date().toISOString());

    // TODO: 여기에 AI 봇 호출 로직 추가 예정
    // 1. AI 봇으로 댓글 생성
    // 2. 데이터베이스에 저장
    // 3. 블로그에 댓글 노출

    return NextResponse.json({
      success: true,
      message: '새 포스트 감지 완료',
      data: {
        post_id: body.post_id,
        url: body.url,
        received_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '웹훅 처리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
