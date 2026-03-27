import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'

interface CertificateData {
  certificateId: string
  certificateNumber: string
  studentName: string
  courseTitle: string
  issuedAt: string
  appUrl: string
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height

      // Background gradient effect using rectangles
      doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a')

      // Top accent line
      doc.rect(0, 0, pageWidth, 8).fill('#3b82f6')
      // Bottom accent line
      doc.rect(0, pageHeight - 8, pageWidth, 8).fill('#3b82f6')
      // Left accent line
      doc.rect(0, 0, 8, pageHeight).fill('#3b82f6')
      // Right accent line
      doc.rect(pageWidth - 8, 0, 8, pageHeight).fill('#3b82f6')

      // Inner border
      doc
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(1)
        .stroke('#1e40af')

      // Title
      doc
        .font('Helvetica-Bold')
        .fontSize(42)
        .fillColor('#f8fafc')
        .text('СЕРТИФИКАТ', 0, 80, { align: 'center' })

      // Subtitle
      doc
        .font('Helvetica')
        .fontSize(16)
        .fillColor('#94a3b8')
        .text('об успешном завершении курса', 0, 135, { align: 'center' })

      // Decorative line
      const lineY = 170
      doc
        .moveTo(100, lineY)
        .lineTo(pageWidth - 100, lineY)
        .lineWidth(1)
        .stroke('#1e40af')

      // "This is to certify that" text
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#94a3b8')
        .text('Настоящим подтверждается, что', 0, 190, { align: 'center' })

      // Student name
      doc
        .font('Helvetica-Bold')
        .fontSize(32)
        .fillColor('#60a5fa')
        .text(data.studentName, 0, 215, { align: 'center' })

      // "has completed" text
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#94a3b8')
        .text('успешно завершил(а) курс', 0, 260, { align: 'center' })

      // Course title
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#f8fafc')
        .text(data.courseTitle, 0, 285, { align: 'center', width: pageWidth })

      // Bottom section
      const bottomY = pageHeight - 140

      // Certificate number
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Номер сертификата: ${data.certificateNumber}`, 60, bottomY)

      // Issue date
      const formattedDate = new Date(data.issuedAt).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Дата выдачи: ${formattedDate}`, 60, bottomY + 20)

      // Verify URL
      const verifyUrl = `${data.appUrl}/verify/${data.certificateNumber}`
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Проверить: ${verifyUrl}`, 60, bottomY + 40)

      // QR Code
      try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 100,
          margin: 1,
          color: {
            dark: '#1e293b',
            light: '#f8fafc',
          },
        })

        const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '')
        const qrBuffer = Buffer.from(qrBase64, 'base64')
        doc.image(qrBuffer, pageWidth - 160, bottomY - 10, { width: 100, height: 100 })
      } catch (qrError) {
        console.error('QR code generation error:', qrError)
      }

      // Platform name
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#3b82f6')
        .text('LMS Platform', pageWidth / 2 - 50, bottomY + 10, { align: 'center', width: 100 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

export async function generateAndStoreCertificate(certificateId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient()

    // Fetch certificate with related data
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        user_id,
        course_id,
        users!inner(first_name, last_name),
        courses!inner(title_ru)
      `)
      .eq('id', certificateId)
      .single()

    if (error || !certificate) {
      console.error('Certificate fetch error:', error)
      return null
    }

    const user = (certificate as any).users as { first_name: string; last_name: string }
    const course = (certificate as any).courses as { title_ru: string }

    const pdfBuffer = await generateCertificatePDF({
      certificateId: certificate.id,
      certificateNumber: certificate.certificate_number,
      studentName: `${user.first_name} ${user.last_name}`.trim(),
      courseTitle: course.title_ru,
      issuedAt: certificate.issued_at,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    })

    // Upload to Supabase storage
    const fileName = `certificates/${certificate.certificate_number}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName)

    const pdfUrl = urlData.publicUrl

    // Update certificate with PDF URL
    await supabase
      .from('certificates')
      .update({ pdf_url: pdfUrl })
      .eq('id', certificateId)

    return pdfUrl
  } catch (error) {
    console.error('generateAndStoreCertificate error:', error)
    return null
  }
}
