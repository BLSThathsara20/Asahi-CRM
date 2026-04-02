/**
 * Reject if `promise` does not settle within `ms` milliseconds.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [message]
 * @returns {Promise<T>}
 */
export function promiseWithTimeout(promise, ms, message = "Request timed out") {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error(message)), ms);
		Promise.resolve(promise)
			.then((v) => {
				clearTimeout(t);
				resolve(v);
			})
			.catch((e) => {
				clearTimeout(t);
				reject(e);
			});
	});
}
