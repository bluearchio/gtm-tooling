#!/usr/bin/env python3
"""
Create simple placeholder icons for the Chrome extension
Creates blue squares with 'LA' text for LinkedIn Auto-apply
"""

import base64

# Simple 1x1 blue pixel PNG as base64
blue_pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

# Decode and save for each size
sizes = [16, 32, 48, 128]

for size in sizes:
    # For now, just copy the same blue pixel image to all sizes
    # In production, you'd want proper icons
    with open(f'assets/icons/icon{size}.png', 'wb') as f:
        f.write(base64.b64decode(blue_pixel))
    print(f"Created icon{size}.png")

print("Icon files created. These are placeholder 1x1 blue pixels.")
print("For production, replace with proper icon files.")