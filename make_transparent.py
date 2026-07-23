from PIL import Image

def process_logo():
    img_path = 'src/assets/kizen-logo.jpg'
    img = Image.open(img_path).convert('RGBA')

    datas = img.getdata()
    new_data = []

    # Get sample corner background color
    bg_r, bg_g, bg_b, _ = datas[0]
    print(f"Sample background color: R={bg_r}, G={bg_g}, B={bg_b}")

    for item in datas:
        r, g, b, a = item
        # Calculate color difference from background
        diff = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
        if diff < 60 or (r < 40 and g < 40 and b < 50):
            new_data.append((0, 0, 0, 0)) # Transparent
        else:
            new_data.append((r, g, b, a))

    img.putdata(new_data)
    out_path = 'src/assets/kizen-logo-transparent.png'
    img.save(out_path, 'PNG')
    print("✓ Successfully saved transparent PNG to:", out_path)

if __name__ == '__main__':
    process_logo()
