import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 간단한 세션 기반 인증 체크
    // TODO: 실제 운영에서는 JWT 토큰이나 더 안전한 세션 관리 필요
    
    // 쿠키에서 세션 정보 확인
    const sessionCookie = request.cookies.get('admin-session');
    
    if (sessionCookie && sessionCookie.value === 'authenticated') {
      return NextResponse.json(
        { 
          success: true, 
          message: '인증됨' 
        },
        { status: 200 }
      );
    }
    
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
