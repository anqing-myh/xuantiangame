# 玄天游戏主页背景图提示词

请生成一张用于中文独立游戏主页的宽幅背景图，比例 16:9，建议 2560×1440。主题是“幽深天幕与星海回响”：深靛蓝、墨黑与微量的黛紫色夜空，大片静谧的宇宙留白，远处舒展、轻盈、若隐若现的蓝紫与暖金色星云，零星细小星光像呼吸一样散落；画面有虚妄、辽阔、安静又浪漫的美感，像一场发生在梦与记忆之间的宇宙漫游。星云自然柔和、透明有层次，避免过亮、避免高饱和霓虹，中心与左侧保持较暗、简洁的低对比区域以便叠加浅色网页文字，右上与边缘可以有淡淡的气体云与远方星尘。纯自然宇宙景观，不出现飞船、空间站、建筑、行星基地、机械、人物、文字、标志、边框或任何人类造物；不出现明显的大型球形行星。电影感、细腻微颗粒、柔和光晕、深色优雅、克制而诗意，适合作为网页背景长期阅读。不要把文字绘制进图片。

建议生成后保存为 `assets/xuantian-nebula.webp`（也可以使用 PNG）。然后在 `public/styles.css` 的 `.sky-glow` 规则中加入图片层，让渐变遮罩继续压住图片，保证文字清晰：

```css
.sky-glow {
  background-image:
    linear-gradient(rgba(9, 13, 24, .42), rgba(9, 13, 24, .72)),
    url('/assets/xuantian-nebula.webp'),
    radial-gradient(ellipse at 78% 12%, rgba(79, 69, 113, .2), transparent 38%),
    radial-gradient(ellipse at 8% 50%, rgba(34, 66, 94, .16), transparent 36%);
  background-position: center, center, center, center;
  background-size: cover, cover, auto, auto;
  background-repeat: no-repeat;
}
```
