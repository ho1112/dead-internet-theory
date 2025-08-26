import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CreateCommentRequest, CommentResponse } from '@/types/comment'
import { v4 as uuidv4 } from 'uuid'

// GET /api/comments - 댓글 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId는 필수 파라미터입니다', code: 'MISSING_POST_ID' },
        { status: 400 }
      )
    }

    // 댓글 조회 (승인된 댓글만, 부모 댓글 먼저, 그 다음 대댓글)
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('댓글 조회 에러:', error)
      return NextResponse.json(
        { success: false, error: '댓글 조회에 실패했습니다', code: 'FETCH_FAILED' },
        { status: 500 }
      )
    }

    // 부모 댓글과 대댓글을 계층 구조로 정리
    const parentComments = comments?.filter(comment => !comment.parent_id) || []
    const childComments = comments?.filter(comment => comment.parent_id) || []

    // 각 부모 댓글에 대댓글을 연결
    const organizedComments = parentComments.map(parent => ({
      ...parent,
      replies: childComments.filter(child => child.parent_id === parent.id)
    }))

    return NextResponse.json({
      success: true,
      data: organizedComments
    })

  } catch (error) {
    console.error('댓글 조회 중 예외 발생:', error)
    return NextResponse.json(
      { success: false, error: '서버 내부 오류가 발생했습니다', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// POST /api/comments - 새 댓글 작성
export async function POST(request: NextRequest) {
  try {
    const body: CreateCommentRequest = await request.json()
    const { content, author_name, author_avatar, is_bot, parent_id, post_id } = body

    // 입력 검증
    if (!content || !author_name || !author_avatar || !post_id) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: '댓글은 1000자를 초과할 수 없습니다', code: 'CONTENT_TOO_LONG' },
        { status: 400 }
      )
    }

    // 댓글 데이터 준비
    const commentData = {
      id: uuidv4(),
      content: content.trim(),
      author_name: author_name.trim(),
      author_avatar,
      is_bot: is_bot || false,
      parent_id: parent_id || null,
      post_id,
      status: 'approved', // 모든 댓글은 즉시 승인됨
      created_at: new Date().toISOString()
    }

    // 댓글 저장
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single()

    if (error) {
      console.error('댓글 저장 에러:', error)
      return NextResponse.json(
        { success: false, error: '댓글 저장에 실패했습니다', code: 'SAVE_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newComment
    }, { status: 201 })

  } catch (error) {
    console.error('댓글 작성 중 예외 발생:', error)
    return NextResponse.json(
      { success: false, error: '서버 내부 오류가 발생했습니다', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
