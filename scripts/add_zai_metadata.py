#!/usr/bin/env python3
"""
Add Z.ai metadata to PDF files
"""

import sys
import os
from pypdf import PdfReader, PdfWriter


def add_metadata(input_path: str, output_path: str = None, title: str = None):
    """Add Z.ai metadata to a PDF file"""
    if output_path is None:
        output_path = input_path
    
    if title is None:
        title = os.path.splitext(os.path.basename(input_path))[0]
    
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
    
    writer.add_metadata({
        '/Title': title,
        '/Author': 'Eco-Loom',
        '/Subject': 'ESG & Carbon Compliance Report',
        '/Creator': 'Eco-Loom Platform',
        '/Producer': 'Eco-Loom PDF Generator',
    })
    
    with open(output_path, 'wb') as output_file:
        writer.write(output_file)
    
    return output_path


def main():
    if len(sys.argv) < 2:
        print("Usage: python add_zai_metadata.py <input_pdf> [output_pdf] [title]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    title = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = add_metadata(input_path, output_path, title)
    print(f"Metadata added to: {result}")


if __name__ == '__main__':
    main()
