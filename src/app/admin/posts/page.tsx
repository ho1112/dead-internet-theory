'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BotTriggerResponse {
  success: boolean;
  message: string;
  data: {
    selected_bot: {
      id: string;
      nickname: string;
      name: string;
      selection_reason: string;
      replyTargetId?: string;
      replyTargetNickname?: string;
    };
    generated_comment: Comment;
    available_personas: Array<{
      name: string;
      nickname: string;
      lang: string;
    }>;
  };
}

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_avatar: string;
  is_bot: boolean;
  parent_id: string | null;
  created_at: string;
  post_id: string;
}

interface PostStats {
  postId: string;
  url: string;
  category: string;
  language: string;
  lastModified: string;
  commentCount: number;
  hasComments: boolean;
}

export default function AdminPostsPage() {
  const [postsStats, setPostsStats] = useState<PostStats[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [botTriggerLoading, setBotTriggerLoading] = useState<string | null>(null);
  const [botTriggerResult, setBotTriggerResult] = useState<BotTriggerResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // 인증 상태 확인
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth-check');
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/admin/login');
      }
    } catch (error) {
      setIsAuthenticated(false);
      router.push('/admin/login');
    }
  };

  // 포스트 통계 조회
  const fetchPostsStats = async () => {
    try {
      setPostsLoading(true);
      
      const response = await fetch('/api/admin/posts-stats');
      const data = await response.json();
      
      if (data.success) {
        setPostsStats(data.data.posts);
      } else {
        console.error('포스트 통계 조회 실패:', data.message);
      }
    } catch (error) {
      console.error('포스트 통계 조회 오류:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // AI 봇 트리거
  const triggerBotForPost = async (postId: string) => {
    try {
      setBotTriggerLoading(postId);
      setBotTriggerResult(null);
      
      const response = await fetch('/api/bot/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      if (response.ok) {
        const result: BotTriggerResponse = await response.json();
        setBotTriggerResult(result);
        
        // 성공 시 포스트 목록 새로고침
        fetchPostsStats();
      } else {
        const errorData = await response.json();
        alert(`AI 봇 트리거 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('AI 봇 트리거 오류:', error);
      alert('AI 봇 트리거 중 오류가 발생했습니다.');
    } finally {
      setBotTriggerLoading(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPostsStats();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">인증 확인 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">댓글 관리 대시보드</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                💬 댓글 관리
              </button>
              <button
                onClick={() => router.push('/admin/login')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 포스트 목록 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">포스트 목록</h3>
                <p className="text-sm text-gray-500 mt-1">
                  전체 포스트와 댓글 현황을 확인할 수 있습니다.
                </p>
                {postsStats.length > 0 && (
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      총 {postsStats.length}개 포스트
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      총 {postsStats.reduce((sum, post) => sum + post.commentCount, 0)}개 댓글
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      댓글 있는 포스트 {postsStats.filter(post => post.hasComments).length}개
                    </span>
                  </div>
                )}
              </div>
              {postsStats.length > 0 && (
                <div className="text-sm text-gray-500">
                  마지막 업데이트: {new Date(postsStats[0]?.lastModified).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>
          
          {postsLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">로딩 중...</div>
          ) : postsStats.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">포스트가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      포스트 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      언어
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      댓글 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {postsStats.map((post) => (
                    <tr key={post.postId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <a 
                          href={post.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {post.postId}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          post.language === 'ko' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.language === 'ko' ? '한국어' : '일본어'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          post.commentCount > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.commentCount}개
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => triggerBotForPost(post.postId)}
                          disabled={botTriggerLoading === post.postId}
                          className={`px-3 py-1 rounded text-sm ${
                            botTriggerLoading === post.postId
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          } text-white`}
                        >
                          {botTriggerLoading === post.postId ? '생성 중...' : 'AI 봇 트리거'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI 봇 트리거 결과 알림 */}
        {botTriggerResult && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            botTriggerResult.success 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {botTriggerResult.success ? '✅ AI 봇 트리거 성공' : '❌ AI 봇 트리거 실패'}
                </h4>
                <p className="text-sm mt-1">{botTriggerResult.message}</p>
                {botTriggerResult.success && (
                  <div className="text-xs mt-2 space-y-1">
                    <p><strong>선택된 봇:</strong> {botTriggerResult.data.selected_bot.nickname}</p>
                    <p><strong>봇 이름:</strong> {botTriggerResult.data.selected_bot.name}</p>
                    <p><strong>선택 이유:</strong> {botTriggerResult.data.selected_bot.selection_reason}</p>
                    <p><strong>댓글 타입:</strong> {botTriggerResult.data.generated_comment.parent_id ? '대댓글' : '새 댓글'}</p>
                    {botTriggerResult.data.generated_comment.parent_id && (
                      <p><strong>대댓글 대상:</strong> {botTriggerResult.data.selected_bot.replyTargetNickname || botTriggerResult.data.selected_bot.replyTargetId || '알 수 없음'}</p>
                    )}
                    <div className="mt-2">
                      <p className="font-medium text-blue-600">생성된 댓글:</p>
                      <div className="bg-gray-50 p-3 rounded border text-sm max-h-32 overflow-y-auto">
                        {botTriggerResult.data.generated_comment.content}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="font-medium text-green-600">사용 가능한 페르소나:</p>
                      {botTriggerResult.data.available_personas.map((persona, index) => (
                        <p key={index} className="text-xs">
                          {persona.nickname} ({persona.name}) - {persona.lang}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setBotTriggerResult(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
