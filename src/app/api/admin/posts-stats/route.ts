import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTableNames } from '@/lib/table-config'

interface PostStats {
  postId: string
  url: string
  category: string
  language: string
  lastModified: string
  commentCount: number
  hasComments: boolean
}

export async function GET(request: NextRequest) {
  try {
    // 1. sitemap에서 포스트 목록 가져오기
    const sitemapUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/sitemap.xml'  // 로컬 블로그
      : 'https://mintora.me/sitemap.xml'     // 운영 블로그
    
    const sitemapResponse = await fetch(sitemapUrl)
    if (!sitemapResponse.ok) {
      throw new Error(`sitemap fetch failed: ${sitemapResponse.status}`)
    }
    
    const sitemapText = await sitemapResponse.text()
    
    // XML 파싱을 위한 정규식 사용
    const posts: Array<{ postId: string; url: string; category: string; language: string; lastModified: string }> = []
    
    // <loc> 태그와 <lastmod> 태그를 찾아서 매칭
    const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g)
    const dateMatches = sitemapText.match(/<lastmod>(.*?)<\/lastmod>/g)
    
    if (urlMatches && dateMatches) {
      for (let i = 0; i < urlMatches.length; i++) {
        const url = urlMatches[i].replace(/<\/?loc>/g, '')
        const date = dateMatches[i].replace(/<\/?lastmod>/g, '')
        
        // 블로그 포스트만 필터링
        if (url.includes('/blog/') && url !== 'https://mintora.me/blog/') {
          const postId = url.replace('https://mintora.me/blog/', '').replace(/\/$/, '')
          const parts = postId.split('/')
          
          if (parts.length >= 2) {
            posts.push({
              postId,
              url,
              category: parts[1],
              language: parts[0],
              lastModified: date
            })
          }
        }
      }
    }
    
    // 2. 데이터베이스에서 댓글 개수 조회
    const tableNames = getTableNames()
    const { data: comments, error } = await supabase
      .from(tableNames.comments)
      .select('post_id, status')
      .eq('status', 'approved')
    
    if (error) {
      throw new Error(`댓글 조회 실패: ${error.message}`)
    }
    
    // 3. 포스트별 댓글 개수 계산
    const commentCounts = comments?.reduce((acc, comment) => {
      acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    // 4. 포스트 통계 생성
    const postsStats: PostStats[] = posts.map(post => ({
      ...post,
      commentCount: commentCounts[post.postId] || 0,
      hasComments: (commentCounts[post.postId] || 0) > 0
    }))
    
    // 5. 카테고리별로 그룹화
    const groupedStats = postsStats.reduce((acc, post) => {
      if (!acc[post.category]) {
        acc[post.category] = []
      }
      acc[post.category].push(post)
      return acc
    }, {} as Record<string, PostStats[]>)
    
    // 6. 전체 통계 계산
    const totalPosts = postsStats.length
    const totalComments = postsStats.reduce((sum, post) => sum + post.commentCount, 0)
    const postsWithComments = postsStats.filter(post => post.hasComments).length
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPosts,
          totalComments,
          postsWithComments,
          postsWithoutComments: totalPosts - postsWithComments
        },
        posts: postsStats,
        groupedByCategory: groupedStats
      }
    })
    
  } catch (error) {
    console.error('포스트 통계 조회 에러:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '포스트 통계 조회에 실패했습니다', 
        code: 'POSTS_STATS_FAILED' 
      },
      { status: 500 }
    )
  }
}
