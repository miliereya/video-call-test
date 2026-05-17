import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
	return (
		<svg
			width='20'
			height='20'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
			{...props}
		>
			{children}
		</svg>
	)
}

export const PaperclipIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='m21 12-9.5 9.5a5.5 5.5 0 0 1-7.78-7.78L13.22 4.22a3.5 3.5 0 0 1 4.95 4.95l-9.42 9.42a1.5 1.5 0 0 1-2.12-2.12L15 8' />
	</Base>
)

export const SendIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M22 2 11 13' />
		<path d='M22 2 15 22l-4-9-9-4 20-7Z' />
	</Base>
)

export const MicIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='9' y='2' width='6' height='12' rx='3' />
		<path d='M5 10v2a7 7 0 0 0 14 0v-2' />
		<path d='M12 19v3' />
	</Base>
)

export const PhoneIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z' />
	</Base>
)

export const VideoIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='m22 8-6 4 6 4V8Z' />
		<rect x='2' y='6' width='14' height='12' rx='2' />
	</Base>
)

export const StopIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='6' y='6' width='12' height='12' rx='2' />
	</Base>
)

export const XIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M18 6 6 18' />
		<path d='m6 6 12 12' />
	</Base>
)

export const PlayIcon = (props: IconProps) => (
	<Base {...props}>
		<polygon points='6 3 20 12 6 21 6 3' />
	</Base>
)

export const PauseIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='6' y='4' width='4' height='16' rx='1' />
		<rect x='14' y='4' width='4' height='16' rx='1' />
	</Base>
)

export const LogoutIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
		<polyline points='16 17 21 12 16 7' />
		<line x1='21' y1='12' x2='9' y2='12' />
	</Base>
)

export const EyeIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
		<circle cx='12' cy='12' r='3' />
	</Base>
)

export const EyeOffIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
		<path d='M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
		<path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' />
		<line x1='2' y1='2' x2='22' y2='22' />
	</Base>
)

export const LockIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='3' y='11' width='18' height='10' rx='2' />
		<path d='M7 11V7a5 5 0 0 1 10 0v4' />
	</Base>
)

export const UnlockIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='3' y='11' width='18' height='10' rx='2' />
		<path d='M7 11V7a5 5 0 0 1 9.9-1' />
	</Base>
)

export const PhoneOffIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91' />
		<line x1='23' y1='1' x2='1' y2='23' />
	</Base>
)

export const MicOffIcon = (props: IconProps) => (
	<Base {...props}>
		<line x1='1' y1='1' x2='23' y2='23' />
		<path d='M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6' />
		<path d='M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23' />
		<line x1='12' y1='19' x2='12' y2='22' />
	</Base>
)

export const VideoOffIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10' />
		<line x1='1' y1='1' x2='23' y2='23' />
	</Base>
)

export const CameraSwitchIcon = (props: IconProps) => (
	<Base {...props}>
		<path d='M23 4v6h-6' />
		<path d='M1 20v-6h6' />
		<path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' />
	</Base>
)

export const SmileyIcon = (props: IconProps) => (
	<Base {...props}>
		<circle cx='12' cy='12' r='10' />
		<path d='M8 14s1.5 2 4 2 4-2 4-2' />
		<line x1='9' y1='9' x2='9.01' y2='9' />
		<line x1='15' y1='9' x2='15.01' y2='9' />
	</Base>
)

export const PlusIcon = (props: IconProps) => (
	<Base {...props}>
		<line x1='12' y1='5' x2='12' y2='19' />
		<line x1='5' y1='12' x2='19' y2='12' />
	</Base>
)

export const GalleryIcon = (props: IconProps) => (
	<Base {...props}>
		<rect x='3' y='3' width='7' height='7' rx='1' />
		<rect x='14' y='3' width='7' height='7' rx='1' />
		<rect x='3' y='14' width='7' height='7' rx='1' />
		<rect x='14' y='14' width='7' height='7' rx='1' />
	</Base>
)
