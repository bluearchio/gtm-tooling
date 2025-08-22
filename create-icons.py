#!/usr/bin/env python3
"""
Create simple placeholder PNG icons for the Chrome extension
"""

import struct
import zlib

def create_minimal_png(width, height):
    """Create a minimal valid PNG file with a blue square"""
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # Create simple blue image data
    # Each row: filter byte + RGB pixels
    raw_data = b''
    for y in range(height):
        row = b'\x00'  # No filter
        for x in range(width):
            # LinkedIn blue color (#0077b5)
            row += b'\x00\x77\xb5'
        raw_data += row
    
    # IDAT chunk (compressed image data)
    compressed = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    # Combine all chunks
    png_data = signature + ihdr_chunk + idat_chunk + iend_chunk
    
    return png_data

# Create icons
sizes = [16, 32, 48, 128]

for size in sizes:
    png_data = create_minimal_png(size, size)
    filename = f'assets/icons/icon{size}.png'
    
    with open(filename, 'wb') as f:
        f.write(png_data)
    
    print(f'Created {filename}')

print('All icon files created successfully!')