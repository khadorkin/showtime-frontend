import Iron from '@hapi/iron'
import CookieService from '@/lib/cookie'
import handler from '@/lib/api-handler'
import backend from '@/lib/backend'

export default handler().post(async ({ body: { recache }, user }, res) => {
	await backend
		.post(
			`/v1/get_follow_suggestions${recache ? '?recache=1' : ''}`,
			{},
			{
				headers: {
					'X-Authenticated-User': user?.publicAddress || null,
					'X-API-Key': process.env.SHOWTIME_FRONTEND_API_KEY_V2,
				},
			}
		)
		.then(resp => res.json(resp.data))
})
