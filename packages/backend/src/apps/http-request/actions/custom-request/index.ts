import defineAction from '../../../../helpers/define-action';

type TMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type THeaderEntry = {
  key: string;
  value: string;
}

type THeaderEntries = THeaderEntry[];

function throwIfFileSizeExceedsLimit(contentLength: string) {
  const maxFileSize = 25 * 1024 * 1024; // 25MB

  if (Number(contentLength) > maxFileSize) {
    throw new Error(
      `Response is too large. Maximum size is 25MB. Actual size is ${contentLength}`
    );
  }
}

export default defineAction({
  name: 'Custom Request',
  key: 'customRequest',
  description: 'Makes a custom HTTP request by providing raw details.',
  arguments: [
    {
      label: 'Method',
      key: 'method',
      type: 'dropdown' as const,
      required: true,
      description: `The HTTP method we'll use to perform the request.`,
      value: 'GET',
      options: [
        { label: 'DELETE', value: 'DELETE' },
        { label: 'GET', value: 'GET' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
      ],
    },
    {
      label: 'URL',
      key: 'url',
      type: 'string' as const,
      required: true,
      description: 'Any URL with a querystring will be re-encoded properly.',
      variables: true,
    },
    {
      label: 'Data',
      key: 'data',
      type: 'string' as const,
      required: false,
      description: 'Place raw JSON data here.',
      variables: true,
    },
    {
      label: 'Headers',
      key: 'headers',
      type: 'dynamic' as const,
      required: false,
      description: 'Add or remove headers as needed',
      value: [{
        key: 'Content-Type',
        value: 'application/json'
      }],
      fields: [
        {
          label: 'Key',
          key: 'key',
          type: 'string' as const,
          required: true,
          description: 'Header key',
          variables: false,
        },
        {
          label: 'Value',
          key: 'value',
          type: 'string' as const,
          required: true,
          description: 'Header value',
          variables: true,
        }
      ],
    }
  ],

  async run($) {
    const method = $.step.parameters.method as TMethod;
    const data = $.step.parameters.data as string;
    const url = $.step.parameters.url as string;
    const headers = $.step.parameters.headers as THeaderEntries;

    const headersObject = headers.reduce((result, entry) => ({ ...result, [entry.key]: entry.value }), {})

    // in case HEAD request is not supported by the URL
    try {
      const metadataResponse = await $.http.head(url, { headers: headersObject });

      throwIfFileSizeExceedsLimit(metadataResponse.headers['content-length']);
      // eslint-disable-next-line no-empty
    } catch { }

    const response = await $.http.request({
      url,
      method,
      data,
      headers: headersObject,
    });

    throwIfFileSizeExceedsLimit(response.headers['content-length']);

    let responseData = response.data;

    if (typeof response.data === 'string') {
      responseData = response.data.replaceAll('\u0000', '');
    }

    $.setActionItem({ raw: { data: responseData } });
  },
});
