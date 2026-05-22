document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = '';
    let currentImage = null;
    let batchResults = [];
    let multiResults = {};

    // ===== 粒子背景 =====
    function createParticles() {
        const container = document.getElementById('particles');
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (6 + Math.random() * 6) + 's';
            particle.innerHTML = `<svg width="${8 + Math.random() * 16}" height="${8 + Math.random() * 16}" viewBox="0 0 24 24" fill="none" stroke="#84cc16" stroke-width="1" opacity="0.3">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>`;
            container.appendChild(particle);
        }
    }
    createParticles();

    // ===== 模式切换 =====
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('mode-' + btn.dataset.mode).classList.add('active');
        });
    });

    // ===== 支付方式选择 =====
    document.querySelectorAll('.method-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.method-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // 更新默认标题
            const method = item.dataset.method;
            const titles = {
                alipay: '推荐使用支付宝',
                wechat: '推荐使用微信支付',
                usdt_trc20: 'USDT-TRC20转账',
                usdt_erc20: 'USDT-ERC20转账',
                union: '推荐使用云闪付'
            };
            document.getElementById('qr-title').value = titles[method] || '扫码向我付款';
        });
    });

    // ===== 风格选择 =====
    document.querySelectorAll('.style-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.style-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // ===== 颜色选择 =====
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            document.getElementById('custom-qr-color').value = dot.dataset.color;
        });
    });

    document.getElementById('custom-qr-color').addEventListener('change', function() {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    });

    // ===== 单码生成 =====
    document.getElementById('generate-btn').addEventListener('click', async function() {
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';

        try {
            const method = document.querySelector('.method-item.active').dataset.method;
            const data = document.getElementById('single-data').value.trim();
            const amount = document.getElementById('amount').value.trim();
            const title = document.getElementById('qr-title').value;
            const subtitle = document.getElementById('qr-subtitle').value;
            const qrColor = document.getElementById('custom-qr-color').value;
            const bgStyle = document.querySelector('.style-item.active').dataset.style;
            const showEnergy = document.getElementById('energy-toggle').checked;

            if (!data) {
                alert('请填写收款链接或钱包地址');
                loading.style.display = 'none';
                return;
            }

            const res = await fetch(API_BASE + '/api/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    method, data, amount: amount || null,
                    title, subtitle, qr_color: qrColor,
                    bg_style: bgStyle, show_energy: showEnergy
                })
            });

            const result = await res.json();

            if (result.success) {
                const container = document.getElementById('qr-preview-container');
                const placeholder = document.getElementById('preview-placeholder');
                const img = document.getElementById('preview-img');

                placeholder.style.display = 'none';
                img.src = result.image;
                img.style.display = 'block';
                container.classList.add('has-image');

                document.getElementById('download-btn').style.display = 'flex';
                currentImage = result.image;
            } else {
                alert(result.error || '生成失败');
            }
        } catch (e) {
            alert('请求失败: ' + e.message);
        } finally {
            loading.style.display = 'none';
        }
    });

    // ===== 下载单码 =====
    document.getElementById('download-btn').addEventListener('click', async function() {
        if (!currentImage) return;

        const method = document.querySelector('.method-item.active').dataset.method;
        const data = document.getElementById('single-data').value.trim();
        const amount = document.getElementById('amount').value.trim();
        const title = document.getElementById('qr-title').value;
        const subtitle = document.getElementById('qr-subtitle').value;
        const qrColor = document.getElementById('custom-qr-color').value;
        const bgStyle = document.querySelector('.style-item.active').dataset.style;
        const showEnergy = document.getElementById('energy-toggle').checked;

        try {
            const res = await fetch(API_BASE + '/api/download/' + method, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    data, amount: amount || null,
                    title, subtitle, qr_color: qrColor,
                    bg_style: bgStyle, show_energy: showEnergy
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const filename = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] 
                    || `能量码_${method}_${Date.now()}.png`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                // 备用：直接下载 base64
                const link = document.createElement('a');
                link.href = currentImage;
                link.download = `能量码_${method}_${Date.now()}.png`;
                link.click();
            }
        } catch (e) {
            // 备用方案
            const link = document.createElement('a');
            link.href = currentImage;
            link.download = `能量码_${method}_${Date.now()}.png`;
            link.click();
        }
    });

    // ===== 聚合码生成 =====
    document.getElementById('generate-multi-btn').addEventListener('click', async function() {
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';

        try {
            const dataMap = {};
            document.querySelectorAll('[data-multi]').forEach(input => {
                const val = input.value.trim();
                if (val) dataMap[input.dataset.multi] = val;
            });

            if (Object.keys(dataMap).length === 0) {
                alert('请至少填写一个支付方式');
                loading.style.display = 'none';
                return;
            }

            const res = await fetch(API_BASE + '/api/generate-all', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    data_map: dataMap,
                    bg_style: 'gradient-blue',
                    show_energy: true
                })
            });

            const result = await res.json();

            if (result.success) {
                const grid = document.getElementById('multi-grid');
                grid.innerHTML = '';
                multiResults = {};

                let idx = 0;
                for (const [method, data] of Object.entries(result.results)) {
                    if (data.success) {
                        const div = document.createElement('div');
                        div.className = 'multi-grid-item';
                        div.style.animationDelay = (idx * 0.1) + 's';
                        div.innerHTML = `
                            <h4>${data.method_name}</h4>
                            <img src="${data.image}" alt="${method}">
                            <button class="btn-download" style="margin-top:10px;padding:8px;font-size:0.8rem;"
                                onclick="downloadSingle('${method}', '${data.image.replace(/'/g, "\'")}")">
                                ⬇️ 下载
                            </button>
                        `;
                        grid.appendChild(div);
                        multiResults[method] = data.image;
                        idx++;
                    }
                }

                document.getElementById('multi-preview').style.display = 'block';
            }
        } catch (e) {
            alert('请求失败: ' + e.message);
        } finally {
            loading.style.display = 'none';
        }
    });

    // ===== 批量下载 =====
    document.getElementById('download-multi-btn').addEventListener('click', async function() {
        for (const [method, imgData] of Object.entries(multiResults)) {
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `能量码_${method}_${Date.now()}.png`;
            link.click();
            await new Promise(r => setTimeout(r, 300));
        }
    });

    // ===== 批量生成模式 =====
    document.getElementById('generate-batch-btn').addEventListener('click', async function() {
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';

        try {
            const data = document.getElementById('batch-data').value.trim();
            const method = document.getElementById('batch-method').value;

            if (!data) {
                alert('请填写收款链接或地址');
                loading.style.display = 'none';
                return;
            }

            const styles = [
                { name: '蓝色渐变', style: 'gradient-blue' },
                { name: '紫粉渐变', style: 'gradient-purple' },
                { name: '暗黑商务', style: 'gradient-dark' },
                { name: '金色奢华', style: 'gradient-gold' },
                { name: '纯白简约', style: 'solid' },
            ];

            const container = document.getElementById('batch-results');
            container.innerHTML = '';
            container.style.display = 'grid';
            batchResults = [];

            for (let i = 0; i < styles.length; i++) {
                const s = styles[i];
                const res = await fetch(API_BASE + '/api/generate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        method, data,
                        bg_style: s.style,
                        show_energy: true
                    })
                });

                const result = await res.json();
                if (result.success) {
                    const div = document.createElement('div');
                    div.className = 'multi-grid-item';
                    div.style.animationDelay = (i * 0.1) + 's';
                    div.innerHTML = `
                        <h4>${s.name}</h4>
                        <img src="${result.image}" alt="${s.name}">
                        <button class="btn-download" style="margin-top:10px;padding:8px;font-size:0.8rem;"
                            onclick="downloadSingle('${method}', '${result.image.replace(/'/g, "\'")}")">
                            ⬇️ 下载
                        </button>
                    `;
                    container.appendChild(div);
                    batchResults.push({ image: result.image, name: s.name });
                }
            }
        } catch (e) {
            alert('请求失败: ' + e.message);
        } finally {
            loading.style.display = 'none';
        }
    });
});

// 全局下载函数
function downloadSingle(method, imageData) {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `能量码_${method}_${Date.now()}.png`;
    link.click();
}
