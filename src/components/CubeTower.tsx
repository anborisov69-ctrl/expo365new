export default function CubeTower() {
  return (
    <svg
      viewBox="0 0 280 380"
      className="w-48 h-auto"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15))' }}
    >
      <defs>
        <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0B2B5E" />
        </linearGradient>
        <linearGradient id="connectingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0B5BA0" />
        </linearGradient>
      </defs>

      {/* Bottom connecting base */}
      <rect x="80" y="320" width="120" height="12" fill="url(#cubeGradient)" rx="2" />

      {/* Connecting lines from base */}
      <g stroke="url(#connectingGradient)" strokeWidth="3" strokeLinecap="round">
        <line x1="100" y1="320" x2="80" y2="260" />
        <line x1="140" y1="320" x2="140" y2="200" />
        <line x1="180" y1="320" x2="200" y2="260" />

        {/* Upper connecting lines */}
        <line x1="80" y1="260" x2="80" y2="160" />
        <line x1="200" y1="260" x2="200" y2="160" />
        <line x1="80" y1="160" x2="100" y2="100" />
        <line x1="200" y1="160" x2="180" y2="100" />
        <line x1="100" y1="100" x2="140" y2="50" />
        <line x1="180" y1="100" x2="140" y2="50" />
      </g>

      {/* Connection nodes (dots) */}
      <g fill="#0EA5E9">
        <circle cx="80" cy="260" r="5" />
        <circle cx="200" cy="260" r="5" />
        <circle cx="80" cy="160" r="5" />
        <circle cx="200" cy="160" r="5" />
        <circle cx="100" cy="100" r="5" />
        <circle cx="180" cy="100" r="5" />
        <circle cx="140" cy="50" r="5" />
        <circle cx="140" cy="200" r="5" />
        <circle cx="100" cy="320" r="5" />
        <circle cx="180" cy="320" r="5" />
      </g>

      {/* Bottom left cube */}
      <g>
        {/* Front face */}
        <polygon
          points="50,280 90,280 90,320 50,320"
          fill="url(#cubeGradient)"
          opacity="0.9"
        />
        {/* Top face */}
        <polygon
          points="50,280 70,260 110,260 90,280"
          fill="#0EA5E9"
          opacity="0.7"
        />
        {/* Right face */}
        <polygon
          points="90,280 110,260 110,300 90,320"
          fill="#0B5BA0"
          opacity="0.8"
        />
        {/* Stroke */}
        <polygon
          points="50,280 90,280 90,320 50,320"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Bottom center cube */}
      <g>
        {/* Front face */}
        <polygon
          points="120,280 160,280 160,320 120,320"
          fill="url(#cubeGradient)"
          opacity="0.95"
        />
        {/* Top face */}
        <polygon
          points="120,280 140,260 180,260 160,280"
          fill="#0EA5E9"
          opacity="0.75"
        />
        {/* Right face */}
        <polygon
          points="160,280 180,260 180,300 160,320"
          fill="#0B5BA0"
          opacity="0.85"
        />
        {/* Stroke */}
        <polygon
          points="120,280 160,280 160,320 120,320"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Bottom right cube */}
      <g>
        {/* Front face */}
        <polygon
          points="190,280 230,280 230,320 190,320"
          fill="url(#cubeGradient)"
          opacity="0.9"
        />
        {/* Top face */}
        <polygon
          points="190,280 210,260 250,260 230,280"
          fill="#0EA5E9"
          opacity="0.7"
        />
        {/* Right face */}
        <polygon
          points="230,280 250,260 250,300 230,320"
          fill="#0B5BA0"
          opacity="0.8"
        />
        {/* Stroke */}
        <polygon
          points="190,280 230,280 230,320 190,320"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Middle left cube */}
      <g>
        {/* Front face */}
        <polygon
          points="40,200 80,200 80,240 40,240"
          fill="url(#cubeGradient)"
          opacity="0.85"
        />
        {/* Top face */}
        <polygon
          points="40,200 60,180 100,180 80,200"
          fill="#0EA5E9"
          opacity="0.65"
        />
        {/* Right face */}
        <polygon
          points="80,200 100,180 100,220 80,240"
          fill="#0B5BA0"
          opacity="0.8"
        />
        {/* Stroke */}
        <polygon
          points="40,200 80,200 80,240 40,240"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Middle center cube */}
      <g>
        {/* Front face */}
        <polygon
          points="110,160 150,160 150,200 110,200"
          fill="url(#cubeGradient)"
          opacity="1"
        />
        {/* Top face */}
        <polygon
          points="110,160 130,140 170,140 150,160"
          fill="#0EA5E9"
          opacity="0.8"
        />
        {/* Right face */}
        <polygon
          points="150,160 170,140 170,180 150,200"
          fill="#0B5BA0"
          opacity="0.9"
        />
        {/* Stroke */}
        <polygon
          points="110,160 150,160 150,200 110,200"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Middle right cube */}
      <g>
        {/* Front face */}
        <polygon
          points="200,200 240,200 240,240 200,240"
          fill="url(#cubeGradient)"
          opacity="0.85"
        />
        {/* Top face */}
        <polygon
          points="200,200 220,180 260,180 240,200"
          fill="#0EA5E9"
          opacity="0.65"
        />
        {/* Right face */}
        <polygon
          points="240,200 260,180 260,220 240,240"
          fill="#0B5BA0"
          opacity="0.8"
        />
        {/* Stroke */}
        <polygon
          points="200,200 240,200 240,240 200,240"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Top left cube */}
      <g>
        {/* Front face */}
        <polygon
          points="60,120 100,120 100,160 60,160"
          fill="url(#cubeGradient)"
          opacity="0.8"
        />
        {/* Top face */}
        <polygon
          points="60,120 80,100 120,100 100,120"
          fill="#0EA5E9"
          opacity="0.6"
        />
        {/* Right face */}
        <polygon
          points="100,120 120,100 120,140 100,160"
          fill="#0B5BA0"
          opacity="0.75"
        />
        {/* Stroke */}
        <polygon
          points="60,120 100,120 100,160 60,160"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Top right cube */}
      <g>
        {/* Front face */}
        <polygon
          points="180,120 220,120 220,160 180,160"
          fill="url(#cubeGradient)"
          opacity="0.8"
        />
        {/* Top face */}
        <polygon
          points="180,120 200,100 240,100 220,120"
          fill="#0EA5E9"
          opacity="0.6"
        />
        {/* Right face */}
        <polygon
          points="220,120 240,100 240,140 220,160"
          fill="#0B5BA0"
          opacity="0.75"
        />
        {/* Stroke */}
        <polygon
          points="180,120 220,120 220,160 180,160"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
        />
      </g>

      {/* Top center cube (main highlight) */}
      <g>
        {/* Front face */}
        <polygon
          points="100,60 140,60 140,100 100,100"
          fill="#0EA5E9"
          opacity="1"
        />
        {/* Top face */}
        <polygon
          points="100,60 120,40 160,40 140,60"
          fill="#0EA5E9"
          opacity="0.85"
        />
        {/* Right face */}
        <polygon
          points="140,60 160,40 160,80 140,100"
          fill="#0B5BA0"
          opacity="0.95"
        />
        {/* Stroke */}
        <polygon
          points="100,60 140,60 140,100 100,100"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="2"
        />
      </g>

      {/* Top apex cube */}
      <g>
        {/* Front face */}
        <polygon
          points="110,20 130,20 130,40 110,40"
          fill="#0EA5E9"
          opacity="0.95"
        />
        {/* Top face */}
        <polygon
          points="110,20 120,10 140,10 130,20"
          fill="#0EA5E9"
          opacity="0.9"
        />
        {/* Right face */}
        <polygon
          points="130,20 140,10 140,30 130,40"
          fill="#0B5BA0"
          opacity="1"
        />
        {/* Stroke */}
        <polygon
          points="110,20 130,20 130,40 110,40"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
