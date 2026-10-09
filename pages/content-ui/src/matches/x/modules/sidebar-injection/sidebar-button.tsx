interface SidebarButtonProps {
  onClick: () => void
}

export function SidebarButton({ onClick }: SidebarButtonProps) {
  return (
    <button
      id="catalyst-toggle-button"
      aria-label="OptimAI Agentic"
      title="OptimAI Agentic"
      onClick={onClick}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 266 266"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="133" cy="133" r="123" stroke="currentColor" strokeWidth="20" />
        <path
          d="M234.426 217.165C227.724 225.043 220.125 232.119 211.772 238.252L201.483 220.42L116.906 74.0812C116.151 72.7603 116.151 71.2035 116.906 69.8826L129.508 48.0875C131.113 45.3042 135.172 45.3042 136.776 48.0875L223.524 198.247L234.473 217.165H234.426Z"
          fill="currentColor"
        />
        <path
          d="M156.693 216.268H131.49C129.98 216.268 128.611 215.513 127.856 214.193L101.757 168.998C100.152 166.215 96.1402 166.215 94.5355 168.998L64.9432 220.231L54.6544 238.063C46.2534 231.931 38.6547 224.854 32 216.929L42.9968 197.964L84.9546 125.408C87.5032 120.691 92.4588 117.436 98.1696 117.436C103.88 117.436 108.411 120.36 111.054 124.748H111.149L160.422 210.041C162.027 212.824 159.997 216.268 156.741 216.268H156.693Z"
          fill="currentColor"
        />
      </svg>

      <span>OptimAI Agentic</span>
    </button>
  )
}
