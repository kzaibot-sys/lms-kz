'use client'

import { useState } from 'react'
import { Plus, XCircle, Download, Loader2, Award } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface CertRow {
  id: string
  certificate_number: string
  issued_at: string
  pdf_url: string | null
  is_revoked: boolean
  revoked_at: string | null
  revoke_reason: string | null
  student: { id: string; first_name: string; last_name: string; email: string } | null
  course: { id: string; title_ru: string } | null
}

interface AdminCertificatesTableProps {
  certificates: CertRow[]
  students: { id: string; first_name: string; last_name: string; email: string }[]
  courses: { id: string; title_ru: string }[]
}

export function AdminCertificatesTable({
  certificates: initialCerts,
  students,
  courses,
}: AdminCertificatesTableProps) {
  const [certs, setCerts] = useState(initialCerts)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [issueForm, setIssueForm] = useState({ studentId: '', courseId: '' })
  const [error, setError] = useState<string | null>(null)

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.studentId || !issueForm.courseId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: issueForm.studentId,
          course_id: issueForm.courseId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка выдачи сертификата')
      }

      const data = await response.json()
      const newCert = data.certificate ?? data
      setCerts((prev) => [{ ...newCert, student: null, course: null }, ...prev])
      setShowIssueModal(false)
      setIssueForm({ studentId: '', courseId: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/certificates/${id}/revoke`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка отзыва сертификата')
      }

      setCerts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, is_revoked: true, revoked_at: new Date().toISOString(), revoke_reason: revokeReason }
            : c
        )
      )
      setShowRevokeModal(null)
      setRevokeReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Issue Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Выдать сертификат
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Студент</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Курс</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">№ сертификата</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата выдачи</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {certs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Сертификатов нет
                  </td>
                </tr>
              ) : (
                certs.map((cert) => (
                  <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {cert.student ? (
                        <div>
                          <p className="font-medium">{cert.student.first_name} {cert.student.last_name}</p>
                          <p className="text-xs text-muted-foreground">{cert.student.email}</p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                      <p className="truncate">{cert.course?.title_ru ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{cert.certificate_number}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(cert.issued_at), 'd MMM yyyy', { locale: ru })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cert.is_revoked
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {cert.is_revoked ? 'Отозван' : 'Действителен'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {cert.pdf_url && (
                          <a
                            href={`/api/certificates/${cert.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Скачать PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        {!cert.is_revoked && (
                          <button
                            onClick={() => setShowRevokeModal(cert.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors dark:hover:bg-red-950"
                            title="Отозвать"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">Выдать сертификат</h2>
            <form onSubmit={handleIssue} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Студент</label>
                <select
                  value={issueForm.studentId}
                  onChange={(e) => setIssueForm((p) => ({ ...p, studentId: e.target.value }))}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Выберите студента</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Курс</label>
                <select
                  value={issueForm.courseId}
                  onChange={(e) => setIssueForm((p) => ({ ...p, courseId: e.target.value }))}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Выберите курс</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title_ru}</option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Выдать
                </button>
                <button
                  type="button"
                  onClick={() => { setShowIssueModal(false); setError(null) }}
                  className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-red-600">Отозвать сертификат</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Введите причину отзыва сертификата (необязательно):
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Причина отзыва..."
              className="mb-4 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleRevoke(showRevokeModal)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Отозвать
              </button>
              <button
                onClick={() => { setShowRevokeModal(null); setRevokeReason(''); setError(null) }}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
