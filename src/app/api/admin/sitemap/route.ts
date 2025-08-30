import { NextRequest, NextResponse } from 'next/server'

interface PostInfo {
  url: string
  postId: string
  lastModified: string
  category: string
  language: string
}

export async function GET(request: NextRequest) {
  try {
    // sitemap.xml 가져오기
    const sitemapUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/sitemap.xml'  // 로컬 블로그
      : 'https://mintora.me/sitemap.xml'     // 운영 블로그
    
    const response = await fetch(sitemapUrl)
    if (!response.ok) {
      throw new Error(`sitemap fetch failed: ${response.status}`)
    }
    
    const sitemapText = await response.text()
    
    // 텍스트를 줄 단위로 분리하고 블로그 포스트만 필터링
    const lines = sitemapText.split('\n')
    const posts: PostInfo[] = []
    
    for (const line of lines) {
      if (line.includes('/blog/')) {
        const [url, date] = line.trim().split(' ')
        if (url && date) {
          // URL에서 포스트 정보 추출
          const postId = url.replace('https://mintora.me/blog/', '').replace(/\/$/, '')
          const parts = postId.split('/')
          
          if (parts.length >= 2) {
            const language = parts[0] // ko, ja
            const category = parts[1] // weekly, workLog, inspiration 등
            
            posts.push({
              url,
              postId,
              lastModified: date,
              category,
              language
            })
          }
        }
      }
    }
    
    // 카테고리별로 그룹화
    const groupedPosts = posts.reduce((acc, post) => {
      if (!acc[post.category]) {
        acc[post.category] = []
      }
      acc[post.category].push(post)
      return acc
    }, {} as Record<string, PostInfo[]>)
    
    return NextResponse.json({
      success: true,
      data: {
        totalPosts: posts.length,
        posts: posts,
        groupedByCategory: groupedPosts
      }
    })
    
  } catch (error) {
    console.error('sitemap 파싱 에러:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'sitemap 파싱에 실패했습니다', 
        code: 'SITEMAP_PARSE_FAILED' 
      },
      { status: 500 }
    )
  }
}
