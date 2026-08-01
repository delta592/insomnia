import protobuf from 'protobufjs';

const bufReflectRoot = protobuf.parse(`
  syntax = "proto3";

  package buf.reflect.v1beta1;

  message GetFileDescriptorSetRequest {
    string module = 1;
    string version = 2;
    repeated string symbols = 3;
  }

  message GetFileDescriptorSetResponse {
    google.protobuf.FileDescriptorSet file_descriptor_set = 1;
    string version = 2;
  }
`).root;

// google.protobuf.FileDescriptorSet is provided by protobufjs common types.
protobuf.common('google.protobuf.FileDescriptorSet', {
  fields: {
    file: {
      rule: 'repeated',
      type: 'google.protobuf.FileDescriptorProto',
      id: 1,
    },
  },
});

const GetFileDescriptorSetRequest = bufReflectRoot.lookupType('buf.reflect.v1beta1.GetFileDescriptorSetRequest');
const GetFileDescriptorSetResponse = bufReflectRoot.lookupType('buf.reflect.v1beta1.GetFileDescriptorSetResponse');

export interface BufReflectionRequest {
  module: string;
  version?: string;
  symbols?: string[];
}

export async function fetchFileDescriptorSet(
  baseUrl: string,
  request: BufReflectionRequest,
  headers: HeadersInit,
): Promise<{ fileDescriptorSet?: Record<string, unknown>; version?: string }> {
  const payload = GetFileDescriptorSetRequest.encode(
    GetFileDescriptorSetRequest.create({
      module: request.module,
      version: request.version,
      symbols: request.symbols,
    }),
  ).finish();

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/buf.reflect.v1beta1.FileDescriptorSetService/GetFileDescriptorSet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/proto',
      ...Object.fromEntries(new Headers(headers).entries()),
    },
    body: Buffer.from(payload),
  });

  if (!response.ok) {
    throw new Error(`Buf reflection request failed with status ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const decoded = GetFileDescriptorSetResponse.decode(bytes) as protobuf.Message & {
    fileDescriptorSet?: Record<string, unknown>;
    version?: string;
  };

  return {
    fileDescriptorSet: decoded.fileDescriptorSet,
    version: decoded.version,
  };
}
