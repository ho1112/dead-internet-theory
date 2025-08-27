import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTableNames } from '@/lib/table-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tableNames = getTableNames();
    const commentsTable = tableNames.comments;

    // 기본 쿼리
    let query = supabaseAdmin
      .from(commentsTable)
      .select('*')
      .order('created_at', { ascending: false });

    // postId가 있으면 필터링
    if (postId) {
      query = query.eq('post_id', postId);
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);

    const { data: comments, error, count } = await query;

    if (error) {
      console.error('Comments fetch error:', error);
      return NextResponse.json(
        { error: true, message: '댓글 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 전체 댓글 수 조회 (페이지네이션용)
    let totalCount = 0;
    if (postId) {
      const { count: postCount } = await supabaseAdmin
        .from(commentsTable)
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      totalCount = postCount || 0;
    } else {
      const { count: allCount } = await supabaseAdmin
        .from(commentsTable)
        .select('*', { count: 'exact', head: true });
      totalCount = allCount || 0;
    }

    return NextResponse.json({
      success: true,
      comments: comments || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { error: true, message: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
