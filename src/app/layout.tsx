import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ลอยกระทงริมแม่น้ำเจ้าพระยา | วัดอรุณราชวราราม",
  description:
    "ประดิษฐ์กระทง เขียนคำอธิษฐาน ปล่อยโคมลอย จุดพลุเหนือลำน้ำ และบันทึกบัตรที่ระลึกร่วมกันในคืนเพ็ญเดือนสิบสอง ณ ท่าน้ำวัดอรุณราชวราราม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-[#060504] font-sans text-[#efe6d5] antialiased selection:bg-[#c9a461]/30 selection:text-[#f8eedb]">
        {children}
      </body>
    </html>
  );
}
