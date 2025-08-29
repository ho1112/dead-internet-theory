import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: 실제로는 JWT 토큰이나 세션을 확인해야 함
    // 현재는 간단한 응답만 반환
    
    // 쿠키나 헤더에서 인증 정보 확인
    const authHeader = request.headers.get('authorization');
    
    // 임시로 항상 인증 실패 처리 (보안 강화)
    return NextResponse.json(
      { 
        success: false, 
        message: '인증이 필요합니다.' 
      },
      { status: 401 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: '인증 확인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
