'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_avatar: string;
  is_bot: boolean;
  created_at: string;
  post_id: string;
  status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

type TabType = 'comments' | 'posts';

export default function AdminDashboardPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchPostId, setSearchPostId] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [postsStats, setPostsStats] = useState<PostStats[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const router = useRouter();

  // 인증 상태 확인
  const checkAuth = async () => {
    try {
      // 간단한 인증 체크 (실제로는 JWT나 세션 토큰 사용 권장)
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
        setError(data.message || '포스트 통계 조회에 실패했습니다.');
      }
    } catch (error) {
      setError('포스트 통계 조회 중 오류가 발생했습니다.');
    } finally {
      setPostsLoading(false);
    }
  };

  // 댓글 목록 조회
  const fetchComments = async (page: number = 1, postId?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (postId) {
        params.append('postId', postId);
      }
      
      const response = await fetch(`/api/admin/comments?${params}`);
      const data = await response.json();

      if (data.success) {
        setComments(data.comments);
        setPagination(data.pagination);
      } else {
        setError(data.message || '댓글 조회에 실패했습니다.');
      }
    } catch (error) {
      setError('댓글 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 포스트 ID로 검색
  const handleSearch = () => {
    if (searchPostId.trim()) {
      setCurrentSearch(searchPostId.trim());
      fetchComments(1, searchPostId.trim());
    }
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchPostId('');
    setCurrentSearch('');
    fetchComments(1);
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // 삭제 성공 시 댓글 목록 새로고침
        fetchComments(pagination.page);
      } else {
        setError(data.message || '댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      setError('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchComments(newPage, currentSearch || undefined);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'comments') {
        fetchComments();
      } else if (activeTab === 'posts') {
        fetchPostsStats();
      }
    }
  }, [isAuthenticated, activeTab]);

  // 로그아웃
  const handleLogout = () => {
    // 간단한 로그아웃 (실제로는 세션/쿠키 정리 필요)
    router.push('/admin/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">인증 확인 중...</div>
      </div>
    );
  }

  if (isLoading && comments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">댓글 관리 대시보드</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 통계 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">💬</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">전체 댓글</dt>
                    <dd className="text-lg font-medium text-gray-900">{pagination.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">🤖</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">봇 댓글</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {comments.filter(c => c.is_bot).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">👤</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">일반 댓글</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {comments.filter(c => !c.is_bot).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'comments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💬 댓글 관리
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 포스트 목록
              </button>
            </nav>
          </div>
        </div>

        {/* 댓글 관리 탭 */}
        {activeTab === 'comments' && (
          <>
            {/* 검색 기능 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">댓글 검색</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="포스트 ID 입력 (예: ko/weekly/250823)"
                    value={searchPostId}
                    onChange={(e) => setSearchPostId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    검색
                  </button>
                  {currentSearch && (
                    <button
                      onClick={handleClearSearch}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      초기화
                    </button>
                  )}
                </div>
                {currentSearch && (
                  <div className="mt-3 text-sm text-gray-600">
                    검색 결과: <span className="font-medium">{currentSearch}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 댓글 관리 탭 */}
        {activeTab === 'comments' && (
          <>
            {/* 댓글 목록 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">댓글 목록</h3>
              </div>
              
              {isLoading ? (
                <div className="px-4 py-8 text-center text-gray-500">로딩 중...</div>
              ) : comments.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">댓글이 없습니다.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {comments.map((comment) => (
                    <li key={comment.id} className="px-4 py-4">
                      <div className="flex items-start space-x-3">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={comment.author_avatar}
                          alt={comment.author_name}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {comment.author_name}
                            </p>
                            {comment.is_bot && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                봇
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {new Date(comment.created_at).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">포스트: {comment.post_id}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* 페이지네이션 */}
        {activeTab === 'comments' && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{pagination.total}</span>개 중{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>
                  -{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  개
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* 포스트 목록 탭 */}
        {activeTab === 'posts' && (
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
                            onClick={() => {
                              // TODO: AI 봇으로 댓글 생성 트리거
                              alert(`${post.postId}에 AI 봇으로 댓글을 생성합니다.`);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                          >
                            AI 봇 트리거
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
