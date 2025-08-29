import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { getTableNames } from '@/lib/table-config';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: true, message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const tableNames = getTableNames();
    const usersTable = tableNames.adminUsers;

    // 사용자 조회
    const { data: user, error } = await supabaseAdmin
      .from(usersTable)
      .select('email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: true, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: true, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 로그인 성공 시 세션 쿠키 설정
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      user: {
        email: user.email
      }
    });

    // 세션 쿠키 설정 (7일간 유효)
    response.cookies.set('admin-session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7일
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: true, message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
