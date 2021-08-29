import { ThunkAction } from 'redux-thunk'

export const DEFAULT_POLLING_TIMEOUT = 3000

export type PollingOptions<State, FetchResult = any> = {
  fetchFunction: () => FetchResult
  getPollingRegistration: (state: State, name: string) => boolean
  registerPolling: (name: string) => void
  unregisterPolling: (name: string) => void
  shouldStartCondition: () => boolean
  shouldContinueCondition: (result: FetchResult) => boolean | Promise<boolean>
  onError?: (error: any) => any
  onFinish?: any
  timeout?: number
}

/**
 * Creates a polling and registers it to the store.
 * @param name - Polling name. It is allowed to only have 1 unique polling at a time.
 * @param options
 * @param options.fetchFunction - Function that fetches resources.
 * @param options.getPollingRegistration - Function that reads the status of the polling from the store.
 * @param options.registerPolling - Function to persist the status of the polling to the store.
 * @param options.unregisterPolling - Function to remove the status of the polling from the store.
 * @param options.shouldStartCondition - Function to check if the polling is always of actuality. Checked before the actual fetch request.
 * @param options.shouldContinueCondition - Function to check whether to continue the polling regarding the previous polling result.
 * @param options.onError - (optional) Function executed on error.
 * @param options.onFinish - (optional) Function executed right after that shouldContinueCondition becomes false.
 * @param options.timeout - (optional) Polling timeout.
 */
export function createPolling<State = any>(
  name: string,
  options: PollingOptions<State>
): ThunkAction<void, State, any, any> {
  return async (dispatch, getState) => {
    const pollingIsRegistered = options.getPollingRegistration(getState(), name)

    if (pollingIsRegistered) return

    await dispatch(options.registerPolling(name))

    await dispatch(startPolling<State>(name, options))
  }
}

/**
 * The actual polling runner.
 *
 * @param name
 * @param options
 * @param {object} meta - Polling execution metadata
 * @param {number} meta.numberOfIterations - Number of iterations that polling has done
 * (returns 0 if a polling has executed only 1 full cycle, as in this case polling = simple fetch)
 */
function startPolling<State>(
  name: string,
  options: PollingOptions<State>,
  meta = { numberOfIterations: 1 }
): ThunkAction<void, State, any, any> {
  return async (dispatch, getState) => {
    const {
      fetchFunction,
      onError,
      onFinish,
      shouldStartCondition,
      shouldContinueCondition,
      timeout = DEFAULT_POLLING_TIMEOUT,
      unregisterPolling,
      getPollingRegistration,
    } = options

    const pollingIsRegistered = getPollingRegistration(getState(), name)

    if (!shouldStartCondition() || !pollingIsRegistered) {
      dispatch(unregisterPolling(name))
      return
    }

    try {
      const result = await dispatch(fetchFunction())

      if (shouldContinueCondition(result)) {
        setTimeout(
          () =>
            dispatch(
              startPolling(name, options, {
                ...meta,
                numberOfIterations: meta.numberOfIterations + 1,
              })
            ),
          timeout
        )
      } else {
        dispatch(unregisterPolling(name))

        if (onFinish) {
          onFinish(result, meta)
        }
      }
    } catch (e) {
      dispatch(unregisterPolling(name))

      if (onError) {
        onError(e)
      }
    }
  }
}
