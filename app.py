from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io
import base64
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

PAYMENT_METHODS = {
    'alipay': {'name': '支付宝', 'color': '#1677FF', 'icon': '支', 'bg': ['#1677FF', '#0056d6']},
    'wechat': {'name': '微信支付', 'color': '#07C160', 'icon': '微', 'bg': ['#07C160', '#059669']},
    'usdt_trc20': {'name': 'USDT-TRC20', 'color': '#26A17B', 'icon': 'TR', 'bg': ['#26A17B', '#1a7a5c']},
    'usdt_erc20': {'name': 'USDT-ERC20', 'color': '#3C3C3D', 'icon': 'ER', 'bg': ['#3C3C3D', '#2a2a2b']},
    'union': {'name': '云闪付', 'color': '#C41E3A', 'icon': '云', 'bg': ['#C41E3A', '#9f1239']},
}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_energy_qr(data, method, amount=None, desc=None, title=None, subtitle=None, 
                     qr_color='#000000', bg_style='gradient-blue', show_energy=True,
                     style='modern'):
    """创建能量风格美化二维码 - 基于参考模板设计"""

    mi = PAYMENT_METHODS.get(method, PAYMENT_METHODS['alipay'])
    w, h = 400, 600

    # 创建画布
    img = Image.new('RGB', (w, h), '#ffffff')
    draw = ImageDraw.Draw(img)

    # 背景渐变
    bg_colors = {
        'gradient-blue': ['#1677ff', '#0056d6'],
        'gradient-purple': ['#7c3aed', '#db2777'],
        'gradient-dark': ['#1f2937', '#111827'],
        'gradient-gold': ['#fbbf24', '#d97706'],
        'solid': ['#ffffff', '#f3f4f6'],
    }
    bg = bg_colors.get(bg_style, bg_colors['gradient-blue'])

    # 绘制渐变背景（简化版）
    for y in range(h):
        ratio = y / h
        r = int(int(bg[0][1:3], 16) * (1 - ratio) + int(bg[1][1:3], 16) * ratio)
        g = int(int(bg[0][3:5], 16) * (1 - ratio) + int(bg[1][3:5], 16) * ratio)
        b = int(int(bg[0][5:7], 16) * (1 - ratio) + int(bg[1][5:7], 16) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # 顶部标题区域
    is_light = bg_style == 'solid'
    header_color = '#f3f4f6' if is_light else (255, 255, 255, 30)
    if is_light:
        draw.rectangle([0, 0, w, 100], fill='#f3f4f6')
    else:
        for y in range(100):
            alpha = int(30 * (1 - y/100))
            draw.line([(0, y), (w, y)], fill=(255, 255, 255, alpha))

    # 加载字体
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 9)
    except:
        font_big = font_title = font_sub = font_small = font_tiny = ImageFont.load_default()

    # 平台图标
    icon_bg = mi['color']
    rgb = hex_to_rgb(icon_bg)
    draw.rounded_rectangle([30, 25, 80, 75], radius=12, fill=rgb)
    text_color = 'white'
    bbox = draw.textbbox((0,0), mi['icon'], font=font_big)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((55 - tw//2, 50 - th//2), mi['icon'], fill=text_color, font=font_big)

    # 平台名称
    text_c = '#1f2937' if is_light else 'white'
    draw.text((95, 35), mi['name'], fill=text_c, font=font_big)

    # 主标题
    title_text = title or f"推荐使用{mi['name']}"
    bbox = draw.textbbox((0,0), title_text, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, 140), title_text, fill=text_c, font=font_title)

    # 生成真实QR码
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=qr_color, back_color='white').convert('RGBA')
    qr_size = 260
    qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)

    # QR白色背景
    qr_bg = Image.new('RGBA', (qr_size + 20, qr_size + 20), (255, 255, 255, 255))
    qr_bg.paste(qr_img, (10, 10))

    # 粘贴QR码
    qr_x = (w - qr_size - 20) // 2
    qr_y = 200
    img.paste(qr_bg, (qr_x, qr_y))

    # 能量标签（绿色能量球）
    if show_energy:
        def draw_energy(x, y):
            # 外圈
            draw.ellipse([x-28, y-28, x+28, y+28], fill='#84cc16')
            # 内圈
            draw.ellipse([x-22, y-22, x+22, y+22], outline='#a3e635', width=2)
            # 文字
            draw.text((x, y-3), '绿色', fill='white', font=font_tiny, anchor='mm')
            draw.text((x, y+9), '能量', fill='white', font=font_tiny, anchor='mm')

        draw_energy(qr_x - 5, qr_y + 40)
        draw_energy(qr_x + qr_size + 25, qr_y + qr_size - 40)
        draw_energy(qr_x + qr_size + 25, qr_y + 40)

    # 副标题
    sub_text = subtitle or f"打开{mi['name']}[扫一扫]"
    sub_c = '#6b7280' if is_light else (255, 255, 255, 200)
    if is_light:
        draw.text((w//2, qr_y + qr_size + 50), sub_text, fill='#6b7280', font=font_sub, anchor='mm')
    else:
        draw.text((w//2, qr_y + qr_size + 50), sub_text, fill=(255, 255, 255, 200), font=font_sub, anchor='mm')

    # 金额
    if amount:
        bbox = draw.textbbox((0,0), f"¥{amount}", font=font_title)
        tw = bbox[2] - bbox[0]
        draw.text((w//2, qr_y + qr_size + 90), f"¥{amount}", fill=text_c, font=font_title, anchor='mm')

    # 底部提示
    draw.text((w//2, h - 50), '支付得蚂蚁森林能量', fill=text_c, font=font_sub, anchor='mm')

    # 装饰线条
    line_c = '#84cc16' if not is_light else '#d1d5db'
    draw.line([(50, h-80), (w-50, h-80)], fill=line_c, width=1)

    return img

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/generate', methods=['POST'])
def generate_qr():
    d = request.json
    if not d.get('data'):
        return jsonify({'error':'请提供二维码数据'}), 400
    try:
        img = create_energy_qr(
            d['data'], 
            d.get('method','alipay'),
            amount=d.get('amount'),
            title=d.get('title'),
            subtitle=d.get('subtitle'),
            qr_color=d.get('qr_color','#000000'),
            bg_style=d.get('bg_style','gradient-blue'),
            show_energy=d.get('show_energy', True)
        )
        buf = io.BytesIO()
        img.save(buf, format='PNG', quality=95)
        img_b64 = base64.b64encode(buf.getvalue()).decode()
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_b64}',
            'method_name': PAYMENT_METHODS.get(d.get('method','alipay'),{}).get('name','未知')
        })
    except Exception as e:
        import traceback
        return jsonify({'error':str(e), 'trace': traceback.format_exc()}), 500

@app.route('/api/generate-all', methods=['POST'])
def generate_all():
    d = request.json
    results = {}
    for m, qd in d.get('data_map',{}).items():
        if not qd: continue
        try:
            img = create_energy_qr(qd, m, 
                amount=d.get('amount'),
                title=d.get('title'),
                subtitle=d.get('subtitle'),
                qr_color=d.get('qr_color','#000000'),
                bg_style=d.get('bg_style','gradient-blue'),
                show_energy=d.get('show_energy', True))
            buf = io.BytesIO()
            img.save(buf, format='PNG', quality=95)
            img_b64 = base64.b64encode(buf.getvalue()).decode()
            results[m] = {
                'success': True,
                'image': f'data:image/png;base64,{img_b64}',
                'method_name': PAYMENT_METHODS.get(m,{}).get('name','未知')
            }
        except Exception as e:
            results[m] = {'success': False, 'error': str(e)}
    return jsonify({'success': True, 'results': results})

@app.route('/api/download/<method>', methods=['POST'])
def download(method):
    d = request.json
    if not d.get('data'):
        return jsonify({'error':'请提供数据'}), 400
    try:
        img = create_energy_qr(d['data'], method,
            amount=d.get('amount'),
            title=d.get('title'),
            subtitle=d.get('subtitle'),
            qr_color=d.get('qr_color','#000000'),
            bg_style=d.get('bg_style','gradient-blue'),
            show_energy=d.get('show_energy', True))
        buf = io.BytesIO()
        img.save(buf, format='PNG', quality=95)
        buf.seek(0)
        filename = f"能量码_{PAYMENT_METHODS.get(method,{}).get('name','QR')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error':str(e)}), 500

@app.route('/api/methods')
def get_methods():
    return jsonify(PAYMENT_METHODS)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT',5000)))
