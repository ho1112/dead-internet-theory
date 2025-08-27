import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTableNames } from '@/lib/table-config';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;

    if (!commentId) {
      return NextResponse.json(
        { error: true, message: '댓글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const tableNames = getTableNames();
    const commentsTable = tableNames.comments;

    // 댓글 삭제 (hard delete - 완전히 삭제)
    const { error } = await supabaseAdmin
      .from(commentsTable)
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Comment delete error:', error);
      return NextResponse.json(
        { error: true, message: '댓글 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json(
      { error: true, message: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
