/**
 * 粒子背景：固定位置光点缓慢漂移 + 脉冲，用于 Hero 等全幅区块。
 * 使用确定性坐标，无需 client JS；尊重 prefers-reduced-motion。
 */
const PARTICLE_COUNT = 28;
const positions: Array<[number, number, number]> = [
  [8, 12, 0], [22, 78, 2], [38, 25, 4], [55, 62, 1], [78, 18, 3], [15, 45, 5],
  [72, 72, 0.5], [5, 88, 2.5], [45, 8, 1.5], [88, 55, 3.5], [28, 35, 4.5],
  [62, 42, 0.8], [12, 65, 2.2], [52, 85, 1.2], [82, 38, 3.8], [35, 52, 4.2],
  [68, 15, 1.8], [18, 28, 0.3], [48, 68, 2.8], [75, 82, 4.8], [8, 55, 3.2],
  [42, 22, 1.0], [92, 72, 2.0], [25, 82, 4.0], [58, 35, 0.6], [85, 48, 3.0],
  [32, 58, 1.4], [65, 8, 2.4],
];

const sizes = [3, 4, 5, 6];
const accentColors = [
  "rgba(184, 134, 11, 0.4)",
  "rgba(15, 118, 110, 0.35)",
  "rgba(91, 33, 182, 0.3)",
];

export function ParticleBackground() {
  return (
    <div className="particle-bg" aria-hidden>
      {positions.slice(0, PARTICLE_COUNT).map(([left, top, delay], i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: sizes[i % sizes.length],
            height: sizes[i % sizes.length],
            background: accentColors[i % accentColors.length],
            animationDelay: `${delay}s, ${delay * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
