import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

from app.models.project import Project


class WatermarkCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def draw_watermark(self):
        self.saveState()
        self.setFont('Helvetica-Bold', 60)
        self.setFillColor(colors.lightgrey)
        self.setFillAlpha(0.3)
        self.translate(inch, inch)
        self.rotate(45)
        self.drawCentredString(4 * inch, 1 * inch, "Dohatech New Media")
        self.restoreState()

    def draw_header_footer(self):
        self.saveState()
        self.setFont('Helvetica', 9)
        self.setFillColor(colors.grey)
        
        # Header
        self.drawString(inch, letter[1] - 0.5 * inch, "Dohatech New Media \u2014 Confidential Project Report")
        
        # Footer
        page_num = self.getPageNumber()
        self.drawString(letter[0] - 1.5 * inch, 0.5 * inch, f"Page {page_num}")
        self.drawString(inch, 0.5 * inch, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
        self.restoreState()

    def showPage(self):
        self.draw_watermark()
        self.draw_header_footer()
        super().showPage()


class PdfService:
    @staticmethod
    def generate_project_report(project: Project) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor("#0EA5E9"),
            spaceAfter=20,
            alignment=1  # Center
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor("#334155"),
            spaceAfter=30,
            alignment=1
        )
        h2_style = ParagraphStyle(
            'H2',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=12
        )
        normal_style = styles['Normal']

        elements = []

        # Cover Banner
        elements.append(Paragraph(f"Project Report: {project.name}", title_style))
        org_name = project.organization.name if project.organization else "N/A"
        elements.append(Paragraph(f"Organization: {org_name} | Code: {project.code}", subtitle_style))

        # Executive Overview
        elements.append(Paragraph("Executive Overview", h2_style))
        
        assigned_lead = f"{project.manager.first_name} {project.manager.last_name}" if project.manager else "Unassigned"
        assigned_emp = f"{project.assigned_to.first_name} {project.assigned_to.last_name}" if project.assigned_to else "Unassigned"
        
        overview_data = [
            ["Current Phase:", project.phase.value, "Completion Rate:", f"{project.progress_percentage}%"],
            ["Assigned Lead:", assigned_lead, "Assigned Employee:", assigned_emp],
            ["Total Milestones:", str(len(project.milestones)), "Priority:", project.priority.value]
        ]
        
        overview_table = Table(overview_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 1.5*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#334155")),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(overview_table)
        elements.append(Spacer(1, 30))

        # Milestone Breakdown
        elements.append(Paragraph("Milestones Breakdown", h2_style))
        if project.milestones:
            ms_data = [["Milestone Title", "Status", "Due Date"]]
            for ms in project.milestones:
                status = "Completed" if ms.is_completed else "In Progress"
                due = ms.due_date.strftime("%Y-%m-%d") if ms.due_date else "No Date"
                ms_data.append([ms.title, status, due])
                
            ms_table = Table(ms_data, colWidths=[4*inch, 1.25*inch, 1.25*inch])
            ms_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0EA5E9")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(ms_table)
        else:
            elements.append(Paragraph("No milestones defined for this project.", normal_style))
            
        elements.append(Spacer(1, 30))

        # Task Activity & Metrics
        elements.append(Paragraph("Task Activity & Metrics", h2_style))
        if project.tasks:
            tasks_by_status = {}
            for t in project.tasks:
                st = t.status.value
                tasks_by_status[st] = tasks_by_status.get(st, 0) + 1
                
            task_data = [["Task Status", "Count"]]
            for st, count in tasks_by_status.items():
                task_data.append([st, str(count)])
                
            task_table = Table(task_data, colWidths=[3.25*inch, 3.25*inch])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#10B981")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(task_table)
        else:
            elements.append(Paragraph("No tasks assigned to this project.", normal_style))

        # Build the PDF
        doc.build(elements, canvasmaker=WatermarkCanvas)
        
        buffer.seek(0)
        return buffer
