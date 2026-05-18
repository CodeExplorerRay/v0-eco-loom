#!/usr/bin/env python3
"""
Enterprise-Grade PDF Report Generator for Eco-Loom ESG Reports
Generates professional, visually appealing sustainability compliance reports
"""

import sys
import json
import os
from datetime import datetime
from decimal import Decimal

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

# Register font family for bold support
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Color scheme - Professional ESG/Environmental theme
COLORS = {
    'primary': colors.HexColor('#059669'),      # Green - primary brand color
    'primary_dark': colors.HexColor('#047857'), # Dark green
    'secondary': colors.HexColor('#6366F1'),    # Indigo accent
    'accent': colors.HexColor('#10B981'),       # Emerald
    'warning': colors.HexColor('#F59E0B'),      # Amber
    'danger': colors.HexColor('#EF4444'),       # Red
    'success': colors.HexColor('#22C55E'),      # Green
    'text_primary': colors.HexColor('#1F2937'), # Gray-800
    'text_secondary': colors.HexColor('#6B7280'), # Gray-500
    'bg_light': colors.HexColor('#F3F4F6'),     # Gray-100
    'bg_dark': colors.HexColor('#1F2937'),      # Gray-800
    'table_header': colors.HexColor('#059669'), # Green header
    'table_alt': colors.HexColor('#ECFDF5'),    # Green-50
}

# Standard table color scheme
TABLE_HEADER_COLOR = colors.HexColor('#059669')
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = colors.HexColor('#ECFDF5')


class ReportPDFGenerator:
    def __init__(self, output_path: str, report_data: dict):
        self.output_path = output_path
        self.report = report_data
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch,
            title=f"Eco-Loom_Report_{report_data.get('id', 'unknown')}",
            author='Eco-Loom',
            creator='Eco-Loom ESG Platform',
            subject=f"ESG {report_data.get('reportType', 'Compliance')} Report"
        )
        self.story = []
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            fontName='Times New Roman',
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=COLORS['text_primary'],
            spaceAfter=6
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            fontName='Times New Roman',
            fontSize=14,
            leading=20,
            alignment=TA_CENTER,
            textColor=COLORS['text_secondary'],
            spaceAfter=24
        ))
        
        # Section heading
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            fontName='Times New Roman',
            fontSize=16,
            leading=22,
            alignment=TA_LEFT,
            textColor=COLORS['primary_dark'],
            spaceBefore=18,
            spaceAfter=12,
            borderPadding=6,
            borderWidth=0,
            borderColor=COLORS['primary'],
        ))
        
        # Subsection heading
        self.styles.add(ParagraphStyle(
            name='SubsectionHeading',
            fontName='Times New Roman',
            fontSize=13,
            leading=18,
            alignment=TA_LEFT,
            textColor=COLORS['text_primary'],
            spaceBefore=12,
            spaceAfter=8
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='ReportBody',
            fontName='Times New Roman',
            fontSize=11,
            leading=16,
            alignment=TA_JUSTIFY,
            textColor=COLORS['text_primary'],
            spaceAfter=8
        ))
        
        # Metric value
        self.styles.add(ParagraphStyle(
            name='MetricValue',
            fontName='Times New Roman',
            fontSize=28,
            leading=34,
            alignment=TA_CENTER,
            textColor=COLORS['primary'],
        ))
        
        # Metric label
        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            fontName='Times New Roman',
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=COLORS['text_secondary'],
        ))
        
        # Table header
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            fontName='Times New Roman',
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.white,
        ))
        
        # Table cell
        self.styles.add(ParagraphStyle(
            name='TableCell',
            fontName='Times New Roman',
            fontSize=10,
            leading=14,
            alignment=TA_LEFT,
            textColor=COLORS['text_primary'],
        ))
        
        # Table cell centered
        self.styles.add(ParagraphStyle(
            name='TableCellCenter',
            fontName='Times New Roman',
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=COLORS['text_primary'],
        ))
        
        # Recommendation text
        self.styles.add(ParagraphStyle(
            name='RecommendationText',
            fontName='Times New Roman',
            fontSize=11,
            leading=16,
            alignment=TA_JUSTIFY,
            textColor=COLORS['text_primary'],
            leftIndent=12,
            rightIndent=12,
            spaceBefore=8,
            spaceAfter=8,
            backColor=colors.HexColor('#FEF3C7'),
            borderPadding=10
        ))
        
        # Footer text
        self.styles.add(ParagraphStyle(
            name='FooterText',
            fontName='Times New Roman',
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=COLORS['text_secondary'],
        ))
    
    def _add_cover_page(self):
        """Create a professional cover page"""
        # Top spacer
        self.story.append(Spacer(1, 1.5*inch))
        
        # Logo placeholder - using text for now
        logo_text = Paragraph(
            '<font color="#059669"><b>ECO-LOOM</b></font>',
            ParagraphStyle(
                'LogoStyle',
                fontName='Times New Roman',
                fontSize=18,
                alignment=TA_CENTER,
                textColor=COLORS['primary'],
                spaceAfter=24
            )
        )
        self.story.append(logo_text)
        
        # Report title
        title = self.report.get('title', 'ESG Compliance Report')
        self.story.append(Paragraph(f'<b>{title}</b>', self.styles['ReportTitle']))
        
        # Report type badge
        report_type = self.report.get('reportType', 'gap_analysis').replace('_', ' ').title()
        self.story.append(Paragraph(f'{report_type} Report', self.styles['ReportSubtitle']))
        
        # Decorative line
        self.story.append(HRFlowable(
            width='60%',
            thickness=2,
            color=COLORS['primary'],
            spaceBefore=12,
            spaceAfter=24,
            hAlign='CENTER'
        ))
        
        # Report details table
        created_at = self.report.get('createdAt', datetime.now().isoformat())
        try:
            created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            formatted_date = created_date.strftime('%B %d, %Y')
        except:
            formatted_date = datetime.now().strftime('%B %d, %Y')
        
        details_data = [
            [Paragraph('<b>Reporting Period</b>', self.styles['TableCell']), 
             Paragraph(self.report.get('reportingPeriod', 'N/A'), self.styles['TableCell'])],
            [Paragraph('<b>Report Status</b>', self.styles['TableCell']), 
             Paragraph(self.report.get('status', 'draft').title(), self.styles['TableCell'])],
            [Paragraph('<b>Generated Date</b>', self.styles['TableCell']), 
             Paragraph(formatted_date, self.styles['TableCell'])],
            [Paragraph('<b>Document Version</b>', self.styles['TableCell']), 
             Paragraph('1.0', self.styles['TableCell'])],
        ]
        
        details_table = Table(details_data, colWidths=[2.5*inch, 3*inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (0, -1), COLORS['bg_light']),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
        ]))
        
        self.story.append(details_table)
        
        # Spacer before bottom
        self.story.append(Spacer(1, 2*inch))
        
        # Bottom branding
        self.story.append(Paragraph(
            '<font color="#6B7280">Powered by Eco-Loom ESG &amp; Carbon Compliance Platform</font>',
            self.styles['FooterText']
        ))
        self.story.append(Paragraph(
            '<font color="#6B7280">Notion MCP Challenge 2026</font>',
            self.styles['FooterText']
        ))
        
        # Page break after cover
        self.story.append(PageBreak())
    
    def _add_executive_summary(self):
        """Add executive summary section"""
        self.story.append(Paragraph('<b>Executive Summary</b>', self.styles['SectionHeading']))
        
        summary = self.report.get('summary', 'No summary available.')
        self.story.append(Paragraph(summary, self.styles['ReportBody']))
        self.story.append(Spacer(1, 12))
    
    def _add_emissions_metrics(self):
        """Add emissions metrics section with visual cards"""
        self.story.append(Paragraph('<b>Emissions Overview</b>', self.styles['SectionHeading']))
        
        total_emissions = self.report.get('totalEmissions', 0)
        prev_emissions = self.report.get('previousPeriodEmissions')
        
        # Calculate change percentage
        if prev_emissions and prev_emissions > 0:
            change_pct = ((prev_emissions - total_emissions) / prev_emissions) * 100
            change_text = f"{'decrease' if change_pct >= 0 else 'increase'}"
            change_color = COLORS['success'] if change_pct >= 0 else COLORS['danger']
        else:
            change_pct = 0
            change_text = "no change"
            change_color = COLORS['text_secondary']
        
        # Metrics table - styled like cards
        metrics_data = [
            # Header row (invisible)
            ['', '', ''],
            # Current emissions
            [
                Paragraph('<b>Current Period</b>', ParagraphStyle('MetricTitle', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=COLORS['text_secondary'])),
                Paragraph('<b>Previous Period</b>', ParagraphStyle('MetricTitle', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=COLORS['text_secondary'])),
                Paragraph('<b>Change</b>', ParagraphStyle('MetricTitle', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=COLORS['text_secondary']))
            ],
            # Values row
            [
                Paragraph(f'<font color="#059669"><b>{total_emissions:,.2f}</b></font>', ParagraphStyle('MetricVal', fontName='Times New Roman', fontSize=18, alignment=TA_CENTER, textColor=COLORS['primary'])),
                Paragraph(f'<b>{prev_emissions:,.2f}</b>' if prev_emissions else 'N/A', ParagraphStyle('MetricVal', fontName='Times New Roman', fontSize=18, alignment=TA_CENTER, textColor=COLORS['text_primary'])),
                Paragraph(f'<font color="#{"22C55E" if change_pct >= 0 else "EF4444"}">{"&#8595;" if change_pct >= 0 else "&#8593;"} {abs(change_pct):.1f}%</font>', ParagraphStyle('MetricVal', fontName='Times New Roman', fontSize=18, alignment=TA_CENTER))
            ],
            # Units row
            [
                Paragraph('kg CO<super>2</super>e', ParagraphStyle('MetricUnit', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER, textColor=COLORS['text_secondary'])),
                Paragraph('kg CO<super>2</super>e', ParagraphStyle('MetricUnit', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER, textColor=COLORS['text_secondary'])),
                Paragraph(change_text, ParagraphStyle('MetricUnit', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER, textColor=COLORS['text_secondary']))
            ]
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
        metrics_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 12),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('BOX', (0, 1), (0, -1), 1, COLORS['primary']),
            ('BOX', (1, 1), (1, -1), 1, colors.HexColor('#D1D5DB')),
            ('BOX', (2, 1), (2, -1), 1, COLORS['accent'] if change_pct >= 0 else COLORS['warning']),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        self.story.append(metrics_table)
        self.story.append(Spacer(1, 18))
    
    def _add_gaps_section(self):
        """Add gaps analysis section"""
        gaps_json = self.report.get('gapsIdentified')
        if not gaps_json:
            return
        
        self.story.append(Paragraph('<b>Gap Analysis</b>', self.styles['SectionHeading']))
        
        try:
            gaps = json.loads(gaps_json) if isinstance(gaps_json, str) else gaps_json
        except:
            gaps = []
        
        if not gaps:
            self.story.append(Paragraph('No gaps identified in this reporting period.', self.styles['ReportBody']))
            return
        
        # Build gaps table
        header_style = ParagraphStyle('GapHeader', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=colors.white)
        cell_style = ParagraphStyle('GapCell', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=COLORS['text_primary'])
        cell_left = ParagraphStyle('GapCellLeft', fontName='Times New Roman', fontSize=10, alignment=TA_LEFT, textColor=COLORS['text_primary'])
        
        # Determine table structure based on gap data
        if gaps and isinstance(gaps[0], dict):
            if 'department' in gaps[0]:
                # Department-based gaps
                headers = [Paragraph('<b>Department</b>', header_style), 
                          Paragraph('<b>Current</b>', header_style), 
                          Paragraph('<b>Target</b>', header_style),
                          Paragraph('<b>Status</b>', header_style)]
                
                rows = [headers]
                for gap in gaps:
                    status = gap.get('status', 'unknown')
                    status_color = COLORS['danger'] if status == 'at_risk' else COLORS['warning'] if status == 'needs_attention' else COLORS['success']
                    
                    rows.append([
                        Paragraph(str(gap.get('department', 'N/A')), cell_left),
                        Paragraph(f"{gap.get('gap', 0):,.0f} kg", cell_style),
                        Paragraph(f"{gap.get('target', 0):,.0f} kg", cell_style),
                        Paragraph(f'<font color="{status_color.hexval()}">{status.replace("_", " ").title()}</font>', cell_style)
                    ])
            elif 'goal' in gaps[0]:
                # Goal-based gaps
                headers = [Paragraph('<b>Goal</b>', header_style), 
                          Paragraph('<b>Progress</b>', header_style), 
                          Paragraph('<b>Target</b>', header_style)]
                
                rows = [headers]
                for gap in gaps:
                    rows.append([
                        Paragraph(str(gap.get('goal', 'N/A')), cell_left),
                        Paragraph(f"{gap.get('progress', 0)}%", cell_style),
                        Paragraph(f"{gap.get('target', 0)}%", cell_style)
                    ])
            else:
                # Generic gaps display
                headers = [Paragraph('<b>Item</b>', header_style), Paragraph('<b>Details</b>', header_style)]
                rows = [headers]
                for i, gap in enumerate(gaps, 1):
                    rows.append([
                        Paragraph(f"Gap {i}", cell_style),
                        Paragraph(str(gap), cell_left)
                    ])
            
            col_widths = [6.5*inch / len(headers)] * len(headers)
            gaps_table = Table(rows, colWidths=col_widths)
            gaps_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, 0), 'Times New Roman'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))
            
            self.story.append(gaps_table)
            self.story.append(Spacer(1, 18))
    
    def _add_recommendations(self):
        """Add recommendations section"""
        recommendations = self.report.get('recommendations')
        if not recommendations:
            return
        
        self.story.append(Paragraph('<b>Recommendations</b>', self.styles['SectionHeading']))
        
        # Create a styled recommendation box
        rec_data = [[Paragraph(recommendations, self.styles['ReportBody'])]]
        rec_table = Table(rec_data, colWidths=[6.5*inch])
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ECFDF5')),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['primary']),
            ('LEFTPADDING', (0, 0), (-1, -1), 16),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        self.story.append(rec_table)
        self.story.append(Spacer(1, 18))
    
    def _add_notion_sync_status(self):
        """Add Notion sync status section"""
        notion_page_id = self.report.get('notionPageId')
        if not notion_page_id:
            return
        
        self.story.append(Paragraph('<b>Notion Integration Status</b>', self.styles['SectionHeading']))
        
        synced_at = self.report.get('notionSyncedAt')
        try:
            if synced_at:
                sync_date = datetime.fromisoformat(synced_at.replace('Z', '+00:00'))
                formatted_sync = sync_date.strftime('%B %d, %Y at %I:%M %p')
            else:
                formatted_sync = 'Not synced'
        except:
            formatted_sync = 'Unknown'
        
        status_data = [
            [Paragraph('<b>Notion Page ID</b>', self.styles['TableCell']), 
             Paragraph(notion_page_id, self.styles['TableCell'])],
            [Paragraph('<b>Last Synced</b>', self.styles['TableCell']), 
             Paragraph(formatted_sync, self.styles['TableCell'])],
        ]
        
        status_table = Table(status_data, colWidths=[2*inch, 4.5*inch])
        status_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ECFDF5')),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['primary']),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        self.story.append(status_table)
        self.story.append(Spacer(1, 18))
    
    def _add_footer(self):
        """Add document footer/certification"""
        self.story.append(Spacer(1, 36))
        self.story.append(HRFlowable(
            width='100%',
            thickness=1,
            color=colors.HexColor('#D1D5DB'),
            spaceBefore=12,
            spaceAfter=12
        ))
        
        # Certification text
        self.story.append(Paragraph(
            '<font color="#6B7280">This report was generated by Eco-Loom ESG &amp; Carbon Compliance Platform.</font>',
            self.styles['FooterText']
        ))
        self.story.append(Paragraph(
            f'<font color="#6B7280">Document generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</font>',
            self.styles['FooterText']
        ))
        self.story.append(Paragraph(
            '<font color="#6B7280">Powered by AI-driven sustainability analytics | Notion MCP Challenge 2026</font>',
            self.styles['FooterText']
        ))
    
    def generate(self):
        """Generate the complete PDF report"""
        # Build the document
        self._add_cover_page()
        self._add_executive_summary()
        self._add_emissions_metrics()
        self._add_gaps_section()
        self._add_recommendations()
        self._add_notion_sync_status()
        self._add_footer()
        
        # Build PDF
        self.doc.build(self.story)
        return self.output_path


def main():
    """Main entry point - accepts JSON data as argument"""
    if len(sys.argv) < 3:
        print("Usage: python generate_report_pdf.py <output_path> <report_json>")
        sys.exit(1)
    
    output_path = sys.argv[1]
    report_json = sys.argv[2]
    
    try:
        report_data = json.loads(report_json)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)
    
    generator = ReportPDFGenerator(output_path, report_data)
    result_path = generator.generate()
    print(f"PDF generated successfully: {result_path}")


if __name__ == '__main__':
    main()
