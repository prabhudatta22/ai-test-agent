function getAxiosStatus(err) {
    return err?.response?.status;
}

async function retry(fn, retries = 3, delay = 20000, options = {}) {
    const {
        // By default, don't retry for auth errors.
        shouldRetry = (err) => {
            const status = getAxiosStatus(err);
            if (status === 401 || status === 403) return false;
            return true;
        }
    } = options;

    try {
        return await fn();
    } catch (err) {
        if (retries === 0 || !shouldRetry(err)) throw err;
        await new Promise(res => setTimeout(res, delay));
        return retry(fn, retries - 1, delay * 2, options);
    }
}

module.exports = { retry };