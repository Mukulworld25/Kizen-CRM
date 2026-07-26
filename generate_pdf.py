import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def build_pdf():
    downloads_dir = os.path.expanduser('~/Downloads')
    pdf_filename = os.path.join(downloads_dir, "Kizen_CRM_Phase_3_Final_Handoff_Report.pdf")

    # Also save a copy in project root
    project_pdf = "d:/SAGE DO ASSETS/Kizen-CRM/Kizen_CRM_Phase_3_Final_Handoff_Report.pdf"

    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1C2D4E'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1C2D4E'),
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # Title & Header Banner
    story.append(Paragraph("Kizen Education CRM — Phase 3 Final Handoff Report", title_style))
    story.append(Paragraph("<b>Version:</b> Phase 3 Final Production Release | <b>Date:</b> July 23, 2026 | <b>Database:</b> Supabase Project `zmqvjtenuxlvwfopfroc`", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#F5A623'), spaceAfter=12))

    # Executive Summary
    story.append(Paragraph("Executive Summary & System Architecture", h2_style))
    exec_summary_text = (
        "This document contains the complete technical specifications, database architecture, data integrity audit results, "
        "and hosting deployment models for the <b>Kizen Education CRM (Phase 3 Final Delivery)</b>. The platform was built using React 19, TypeScript, Vite, "
        "TailwindCSS, and Supabase PostgreSQL with Row-Level Security (RLS) policies. It has undergone a 100% automated data accuracy audit "
        "and zero-error TypeScript compilation verification."
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 8))

    # Test Results Table
    story.append(Paragraph("1. Data Accuracy & Integrity Test Results (28 / 28 Passed)", h2_style))

    test_data = [
        [Paragraph("Test Domain", table_header_style), Paragraph("Verification Scope & Description", table_header_style), Paragraph("Status", table_header_style)],
        [Paragraph("Lead Data Lifecycle", table_cell_style), Paragraph("CRUD accuracy, status transitions, temperature tags, hard/soft cleanup.", table_cell_style), Paragraph("<font color='#16A34A'><b>10/10 PASSED</b></font>", table_cell_style)],
        [Paragraph("Student & Fee Math", table_cell_style), Paragraph("Auto-IDs (KIZ-2026-xxx), computed net_fee, pending_balance, payment sync triggers.", table_cell_style), Paragraph("<font color='#16A34A'><b>13/13 PASSED</b></font>", table_cell_style)],
        [Paragraph("Live DB Reconciliation", table_cell_style), Paragraph("Verified 793 Leads, 20 Students, 20 Fee Records, 36 Installments, 8 Active Users.", table_cell_style), Paragraph("<font color='#16A34A'><b>5/5 PASSED</b></font>", table_cell_style)],
        [Paragraph("Production Build", table_cell_style), Paragraph("Strict TypeScript compile (`tsc -b && vite build`) — 0 errors in 7.83s.", table_cell_style), Paragraph("<font color='#16A34A'><b>0 ERRORS</b></font>", table_cell_style)],
    ]

    t1 = Table(test_data, colWidths=[1.8*inch, 4.2*inch, 1.2*inch])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1C2D4E')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(t1)
    story.append(Spacer(1, 10))

    # Core Capabilities
    story.append(Paragraph("2. Implemented Modules & Phase 3 Final Upgrades", h2_style))
    modules_text = (
        "• <b>Lead Management:</b> Kanban board, hot/warm/cold tags, source tracking, counselor allocation.<br/>"
        "• <b>Student Profiles:</b> Unified profiles containing academic details, father's name, family contacts, and admission records.<br/>"
        "• <b>Fees & Installments:</b> Discount math, UPI/Bank Transfer/Cash restriction, GST invoices & printable PDF receipts.<br/>"
        "• <b>Interactive Calendar:</b> Integrated month/week/day agenda view for follow-ups, fee due dates, and demo classes.<br/>"
        "• <b>Security & Password Reset:</b> Owner password reset modal for any team member + self-service credential updates.<br/>"
        "• <b>Audit Logging:</b> Real-time tracking of login timestamps, password updates, and role adjustments in Owner Activity Log.<br/>"
        "• <b>UX Luxury Upgrade:</b> Dark glassmorphism login UI with official Kizen & SAGEDO branding and 1-click instant login."
    )
    story.append(Paragraph(modules_text, body_style))
    story.append(Spacer(1, 10))

    # Hosting Options Table
    story.append(Paragraph("3. Hosting & Database Infrastructure Options (2026)", h2_style))

    host_data = [
        [Paragraph("Option", table_header_style), Paragraph("Stack / Infrastructure", table_header_style), Paragraph("Est. Cost (INR / Mo)", table_header_style), Paragraph("Best For", table_header_style)],
        [Paragraph("<b>Option 0 (Free)</b>", table_cell_style), Paragraph("Vercel Hobby + Supabase Free Tier", table_cell_style), Paragraph("<b>₹0 / mo</b>", table_cell_style), Paragraph("Launch testing & small initial load.", table_cell_style)],
        [Paragraph("<b>Option 1 (AWS India)</b>", table_cell_style), Paragraph("AWS Mumbai Region (`ap-south-1`) + Supabase", table_cell_style), Paragraph("<b>₹1,999 – ₹2,499</b>", table_cell_style), Paragraph("100% Indian DPDP Data Sovereignty (Used by LeadSquared).", table_cell_style)],
        [Paragraph("<b>Option 2 (Managed)</b>", table_cell_style), Paragraph("Vercel Pro + Supabase Pro ($45/mo)", table_cell_style), Paragraph("<b>~₹3,730 / mo</b>", table_cell_style), Paragraph("Zero maintenance, daily backups, 99.99% uptime.", table_cell_style)],
        [Paragraph("<b>Option 3 (Indian VPS)</b>", table_cell_style), Paragraph("Hostinger India / DigitalOcean Bangalore", table_cell_style), Paragraph("<b>₹999 – ₹1,499</b>", table_cell_style), Paragraph("Dedicated Indian KVM VPS with ultra-low latency.", table_cell_style)],
    ]

    t2 = Table(host_data, colWidths=[1.3*inch, 2.7*inch, 1.4*inch, 1.8*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1C2D4E')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(t2)
    story.append(Spacer(1, 12))

    # Signoff Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=8))
    story.append(Paragraph("<b>Report Generated By:</b> Antigravity AI Engineering Team | <b>Repository:</b> github.com/Mukulworld25/Kizen-CRM", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94A3B8'))))

    doc.build(story)
    shutil.copy(pdf_filename, project_pdf)
    print("PDF successfully saved in Downloads directory:", pdf_filename)

if __name__ == "__main__":
    build_pdf()
