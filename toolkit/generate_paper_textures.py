import random
from PIL import Image, ImageDraw, ImageFilter

def generate_paper_texture(width=1080, height=1920, base_color=(246, 240, 232), output_path="assets/retro/textures/cream_paper.png"):
    """
    Generates a high-res organic paper texture with fiber flecks, micro-noise, and subtle edge vignetting.
    """
    # 1. Base color canvas
    img = Image.new("RGB", (width, height), base_color)
    draw = ImageDraw.Draw(img)
    
    # 2. Add subtle grain/noise
    noise = Image.new("L", (width, height))
    noise_data = []
    r, g, b = base_color
    
    for y in range(height):
        # subtle vertical/horizontal gradient
        v_grad = (y / height - 0.5) * 8
        for x in range(width):
            h_grad = (x / width - 0.5) * 6
            rand_val = random.randint(-10, 10)
            noise_data.append(int(128 + rand_val + v_grad + h_grad))
            
    noise.putdata(noise_data)
    noise_blurred = noise.filter(ImageFilter.GaussianBlur(radius=0.7))
    
    # Overlay noise onto base image
    pixels = img.load()
    noise_pixels = noise_blurred.load()
    for y in range(height):
        for x in range(width):
            diff = (noise_pixels[x, y] - 128) * 0.4
            nr = max(0, min(255, int(r + diff)))
            ng = max(0, min(255, int(g + diff)))
            nb = max(0, min(255, int(b + diff)))
            pixels[x, y] = (nr, ng, nb)
            
    # 3. Add paper fiber flecks (small specs of unbleached wood pulp)
    for _ in range(400):
        fx = random.randint(0, width - 1)
        fy = random.randint(0, height - 1)
        flen = random.randint(2, 6)
        fcolor = (max(0, r - 35), max(0, g - 40), max(0, b - 45))
        draw.line([(fx, fy), (fx + random.randint(-flen, flen), fy + random.randint(-flen, flen))], fill=fcolor, width=1)

    # 4. Subtle corner vignette (like an old book page)
    vignette = Image.new("L", (width, height), 0)
    v_draw = ImageDraw.Draw(vignette)
    v_draw.ellipse([(-200, -200), (width + 200, height + 200)], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=120))
    v_pixels = vignette.load()
    
    for y in range(height):
        for x in range(width):
            v_factor = v_pixels[x, y] / 255.0
            # Darken edges slightly (max 8%)
            mult = 0.92 + (0.08 * v_factor)
            cr, cg, cb = pixels[x, y]
            pixels[x, y] = (int(cr * mult), int(cg * mult), int(cb * mult))
            
    img.save(output_path, quality=95)
    print(f"Generated paper texture: {output_path}")

if __name__ == "__main__":
    generate_paper_texture(1080, 1920, (246, 240, 231), "assets/retro/textures/cream_paper.png")
    generate_paper_texture(1080, 1920, (235, 222, 203), "assets/retro/textures/kraft_paper.png")
    generate_paper_texture(1080, 1920, (240, 233, 218), "assets/retro/textures/parchment_paper.png")
