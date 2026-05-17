export const API_PREFIX = '/api'

export const ApiRoutes = {
	auth: {
		login: `${API_PREFIX}/auth/login`,
		logout: `${API_PREFIX}/auth/logout`,
		me: `${API_PREFIX}/auth/me`,
	},
	messages: {
		list: `${API_PREFIX}/messages`,
		send: `${API_PREFIX}/messages`,
		reactions: (id: string) => `${API_PREFIX}/messages/${id}/reactions`,
	},
	files: {
		signUpload: `${API_PREFIX}/files/sign-upload`,
		signDownload: `${API_PREFIX}/files/sign-download`,
	},
} as const
