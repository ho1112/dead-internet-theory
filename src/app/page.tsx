'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 루트 페이지 접근 시 로그인 페이지로 리다이렉트
    router.push('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Dead Internet Theory</h1>
        <p className="text-gray-600 mb-4">댓글 관리 시스템</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">로그인 페이지로 이동 중...</p>
      </div>
    </div>
  );
}
