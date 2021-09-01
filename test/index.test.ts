import thunk from 'redux-thunk'
import configureMockStore from 'redux-mock-store'
import { DEFAULT_POLLING_TIMEOUT, createPolling } from '../src'

const mockStore = (state = {}) => {
  // This (any, any) will let us use ducks thunks in a mocked store
  return configureMockStore<any, any>([thunk])(state)
}

const REGISTER_POLLING = 'REGISTER_POLLING'
const UNREGISTER_POLLING = 'UNREGISTER_POLLING'

jest.useFakeTimers()

describe('polling', () => {
  it('should register and unregister polling', async () => {
    const { dispatch, getActions } = mockStore({
      ui: {
        polling: {},
      },
    })

    const key = 'test-polling'

    await dispatch(
      createPolling(key, {
        fetchFunction: jest.fn(),
        registerPolling: (name) => ({ type: REGISTER_POLLING, name }),
        unregisterPolling: (name) => ({ type: UNREGISTER_POLLING, name }),
        getPollingRegistration: jest.fn(),
        shouldContinueCondition: () => false,
        shouldStartCondition: () => false,
      })
    )

    expect(getActions()).toHaveLength(2)

    const [register, unregister] = getActions()

    expect(register).toEqual({
      type: REGISTER_POLLING,
      name: key,
    })

    expect(unregister).toEqual({
      type: UNREGISTER_POLLING,
      name: key,
    })
  })

  it('should not register already registered entity', async () => {
    const key = 'test-polling'
    const { dispatch, getActions } = mockStore()

    const fetchFunction = jest.fn()
    const registerPolling = jest.fn()
    const unregisterPolling = jest.fn()
    const getPollingRegistration = () => true

    await dispatch(
      createPolling(key, {
        fetchFunction,
        registerPolling,
        unregisterPolling,
        getPollingRegistration,
        shouldContinueCondition: () => false,
        shouldStartCondition: () => false,
      })
    )

    expect(registerPolling).not.toHaveBeenCalled()
    expect(getActions()).toHaveLength(0)
  })

  it('should keep polling until satisfied', async () => {
    const key = 'test-polling'
    const { dispatch, getActions, clearActions } = mockStore()

    const shouldStartCondition = jest.fn(() => true)
    const shouldContinueCondition = jest
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    const fetchFunction = jest.fn(() => () =>
      dispatch({ type: 'fetch_success' })
    )
    const onFinish = jest.fn()

    await dispatch(
      createPolling(key, {
        getPollingRegistration: () => false,
        registerPolling: name => ({ type: REGISTER_POLLING, name }),
        unregisterPolling: name => ({ type: UNREGISTER_POLLING, name }),
        fetchFunction,
        shouldStartCondition,
        shouldContinueCondition,
        onFinish,
      })
    )

    expect(shouldStartCondition).toHaveBeenCalledTimes(1)
    expect(fetchFunction).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledTimes(0)
    expect(getActions()).toHaveLength(2)
    clearActions()

    /**
     * wait for timers then execute job queue
     * we need this because start polling returns promise
     * explanation is available here:
     * https://stackoverflow.com/a/52196951
     */
    jest.advanceTimersByTime(DEFAULT_POLLING_TIMEOUT)
    await Promise.resolve()
    jest.runAllTimers()
    await Promise.resolve()

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(getActions()).toHaveLength(2)
    const [, unregister] = getActions()

    expect(unregister.type).toEqual(UNREGISTER_POLLING)
  })

  it('should handle errors', async () => {
    const { dispatch } = mockStore()

    const onFinish = jest.fn()
    const onError = jest.fn()

    await dispatch(
      createPolling('test-polling', {
        getPollingRegistration: () => false,
        registerPolling: name => () => ({ type: REGISTER_POLLING, name }),
        unregisterPolling: name => () => ({ type: UNREGISTER_POLLING, name }),
        shouldContinueCondition: () => true,
        shouldStartCondition: () => true,
        fetchFunction: () => () => Promise.reject(42),
        onFinish,
        onError,
      })
    )

    await Promise.resolve()

    expect(onFinish).toHaveBeenCalledTimes(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenLastCalledWith(42)
  })
})
