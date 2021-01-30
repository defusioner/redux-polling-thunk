# redux-polling-thunk

A helper to create polling logic inside your store based on redux-thunk middleware.

(5kb gzipped)

# Install

```
npm install redux-polling-thunk
```

# Usage

```
import { createPolling } from 'redux-pollling-thunk'

dispatch(
  createPolling('infinite-appplication-version-check', {
    getPollingRegistration: (state, name) => state.ui.polling[name],
    registerPolling: name => // dispatch an action to register the polling
    unregisterPolling: name  => // dispatch an action to unregister the polling,
    fetchFunction: () => loadApplicationVersion(),
    shouldStartCondition: () => true,
    shouldContinueCondition: () => true,
    timeout: 600000
  })
)
```

# Parameters

|Parameter|Required|Description|
|---|---|---|
|name|x|Polling name. It is allowed to only have 1 unique polling at a time.|
|options.fetchFunction|x|Function that fetches resources.|
|options.getPollingRegistration|x|Function that reads the status of the polling from the store.|
|options.registerPolling|x|Function to persist the status of the polling to the store.|
|options.unregisterPolling|x|Function to remove the status of the polling from the store.|
|options.shouldStartCondition|x|Function to check if the polling is always of actuality. Checked before the actual fetch request.|
|options.shouldContinueCondition|x|Function to check whether to continue the polling regarding the previous polling result.|
|options.onError| |Function executed on error.|
|options.onFinish| |Function executed right after that shouldContinueCondition becomes false.|
|options.timeout| |Polling timeout.|
