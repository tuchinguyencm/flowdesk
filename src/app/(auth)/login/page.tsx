import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Đăng nhập — FlowDesk' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-medium text-neutral-900 mb-1">FlowDesk</div>
          <div className="text-sm text-neutral-400">Workspace cá nhân của bạn</div>
        </div>
        <Suspense fallback={<div className="h-64 bg-white border border-neutral-200 rounded-2xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-neutral-400 mt-6">
          Dữ liệu của bạn được mã hoá và bảo mật
        </p>
      </div>
    </div>
  )
}
