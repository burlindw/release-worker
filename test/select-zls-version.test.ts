import { env, SELF } from "cloudflare:test";
import { describe, test, expect, beforeEach } from "vitest";
import { D2JsonData, insertZLSRelease, ReleaseArtifact } from "../src/shared";
import {
  handleSelectZLSVersion,
  SelectZLSVersionWithoutVersionResponse,
  SelectZLSVersionWithVersionResponse,
} from "../src/select-zls-version";

const default_artifacts: ReleaseArtifact[] = [
  {
    arch: "x86_64",
    os: "linux",
    version: "0.11.0",
    extension: "tar.xz",
    file_shasum: "aaa",
    file_size: 12,
  },
  {
    arch: "aarch64",
    os: "windows",
    version: "0.11.0",
    extension: "zip",
    file_shasum: "bbb",
    file_size: 12,
  },
];

const samples: D2JsonData[] = [
  {
    date: 0,
    zlsVersion: "0.11.0",
    zigVersion: "0.11.0",
    minimumBuildZigVersion: "0.11.0",
    minimumRuntimeZigVersion: "0.11.0",
    artifacts: default_artifacts,
    testedZigVersion: { "0.11.0": true },
  },
  {
    date: 0,
    zlsVersion: "0.12.0-dev.1+aaaaaaaaa",
    zigVersion: "0.11.0",
    minimumBuildZigVersion: "0.11.0",
    minimumRuntimeZigVersion: "0.11.0",
    artifacts: default_artifacts,
    testedZigVersion: {
      "0.11.0": true,
      "0.12.0-dev.2+aaaaaaaaa": true,
      "0.12.0-dev.3+aaaaaaaaa": true,
      "0.12.0-dev.5+aaaaaaaaa": true,
      "0.12.0-dev.7+aaaaaaaaa": false,
    },
  },
  {
    date: 0,
    zlsVersion: "0.12.0-dev.2+aaaaaaaaa",
    zigVersion: "0.12.0-dev.7+aaaaaaaaa",
    minimumBuildZigVersion: "0.11.0",
    minimumRuntimeZigVersion: "0.12.0-dev.7+aaaaaaaaa",
    artifacts: default_artifacts,
    testedZigVersion: {
      "0.12.0-dev.7+aaaaaaaaa": true,
      "0.12.0-dev.8+aaaaaaaaa": true,
      "0.12.0-dev.9+aaaaaaaaa": false,
      "0.12.0-dev.11+aaaaaaaaa": false,
    },
  },
  {
    date: 0,
    zlsVersion: "0.12.0-dev.3+aaaaaaaaa",
    zigVersion: "0.12.0-dev.17+aaaaaaaaa",
    minimumBuildZigVersion: "0.11.0",
    minimumRuntimeZigVersion: "0.12.0-dev.14+aaaaaaaaa",
    artifacts: default_artifacts,
    testedZigVersion: {
      "0.12.0-dev.17+aaaaaaaaa": true,
    },
  },
  {
    date: 0,
    zlsVersion: "0.12.0",
    zigVersion: "0.12.0",
    minimumBuildZigVersion: "0.12.0",
    minimumRuntimeZigVersion: "0.12.0",
    artifacts: default_artifacts,
    testedZigVersion: { "0.12.0": true, "0.12.1": true, "0.12.2": true },
  },
  {
    date: 0,
    zlsVersion: "0.12.1",
    zigVersion: "0.12.0",
    minimumBuildZigVersion: "0.12.0",
    minimumRuntimeZigVersion: "0.12.0",
    artifacts: default_artifacts,
    testedZigVersion: { "0.12.0": true },
  },
  {
    date: 0,
    zlsVersion: "0.13.0",
    zigVersion: "0.13.0",
    minimumBuildZigVersion: "0.13.0",
    minimumRuntimeZigVersion: "0.13.0",
    artifacts: default_artifacts,
    testedZigVersion: {
      "0.13.0": true,
      "0.14.0-dev.2+aaaaaaaaa": true,
      "0.14.0-dev.4+aaaaaaaaa": false,
    },
  },
];

async function selectZLSVersion(
  zigVersion: string,
): Promise<SelectZLSVersionWithVersionResponse | null> {
  const url = new URL("https://example.com/v1/select-zls-version");
  url.searchParams.set("zig_version", zigVersion);

  const response = await handleSelectZLSVersion(new Request(url, {}), env);
  expect(response.status).toBe(200);
  return await response.json();
}

function shuffleArray(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

describe("/v1/select-zls-version", () => {
  test("expect GET method", async () => {
    const response = await SELF.fetch(
      "https://example.com/v1/select-zls-version",
      {
        method: "POST",
      },
    );
    expect(await response.text()).toBe("method must be 'GET'");
    expect(response.status).toBe(405);
  });

  test("invalid zig version", async () => {
    const response = await SELF.fetch(
      "https://example.com/v1/select-zls-version?zig_version=foo",
    );
    expect(await response.text()).toBe(
      "Query component 'zig_version' with value 'foo' is not a valid semantic version!",
    );
    expect(response.status).toBe(400);
  });

  test("search on empty database", async () => {
    const response = await SELF.fetch(
      "https://example.com/v1/select-zls-version",
    );
    expect(await response.json()).toStrictEqual({});
    expect(response.status).toBe(200);
  });

  test("search on empty database with Zig version", async () => {
    const response = await SELF.fetch(
      "https://example.com/v1/select-zls-version?zig_version=0.11.0",
    );
    expect(await response.json()).toBe(null);
    expect(response.status).toBe(200);
  });

  describe("test on sample database", () => {
    beforeEach(async () => {
      shuffleArray(samples);
      for (const sample of samples) await insertZLSRelease(env, sample);
    });

    test("search without version", async () => {
      const response = await handleSelectZLSVersion(
        new Request("https://example.com/v1/select-zls-version"),
        env,
      );
      const body =
        await response.json<SelectZLSVersionWithoutVersionResponse>();

      expect(Object.keys(body)).toStrictEqual([
        "0.13.0",
        "0.12.1",
        "0.12.0",
        "0.11.0",
      ]);
      expect(body).toStrictEqual({
        "0.11.0": {
          date: "1970-01-01",
          "x86_64-linux": {
            tarball: `${env.R2_PUBLIC_URL}/zls-linux-x86_64-0.11.0.tar.xz`,
            shasum: "aaa",
            size: "12",
          },
          "aarch64-windows": {
            tarball: `${env.R2_PUBLIC_URL}/zls-windows-aarch64-0.11.0.zip`,
            shasum: "bbb",
            size: "12",
          },
        },
        "0.12.0": {
          date: "1970-01-01",
          "x86_64-linux": {
            tarball: `${env.R2_PUBLIC_URL}/zls-linux-x86_64-0.11.0.tar.xz`,
            shasum: "aaa",
            size: "12",
          },
          "aarch64-windows": {
            tarball: `${env.R2_PUBLIC_URL}/zls-windows-aarch64-0.11.0.zip`,
            shasum: "bbb",
            size: "12",
          },
        },
        "0.12.1": {
          date: "1970-01-01",
          "x86_64-linux": {
            tarball: `${env.R2_PUBLIC_URL}/zls-linux-x86_64-0.11.0.tar.xz`,
            shasum: "aaa",
            size: "12",
          },
          "aarch64-windows": {
            tarball: `${env.R2_PUBLIC_URL}/zls-windows-aarch64-0.11.0.zip`,
            shasum: "bbb",
            size: "12",
          },
        },
        "0.13.0": {
          date: "1970-01-01",
          "x86_64-linux": {
            tarball: `${env.R2_PUBLIC_URL}/zls-linux-x86_64-0.11.0.tar.xz`,
            shasum: "aaa",
            size: "12",
          },
          "aarch64-windows": {
            tarball: `${env.R2_PUBLIC_URL}/zls-windows-aarch64-0.11.0.zip`,
            shasum: "bbb",
            size: "12",
          },
        },
      });
      expect(response.status).toBe(200);
    });

    test("search for with Version 0.11.0", async () => {
      const response = await selectZLSVersion("0.11.0");
      expect(response).toStrictEqual<SelectZLSVersionWithVersionResponse>({
        date: "1970-01-01",
        version: "0.11.0",
        "x86_64-linux": {
          tarball: `${env.R2_PUBLIC_URL}/zls-linux-x86_64-0.11.0.tar.xz`,
          shasum: "aaa",
          size: "12",
        },
        "aarch64-windows": {
          tarball: `${env.R2_PUBLIC_URL}/zls-windows-aarch64-0.11.0.zip`,
          shasum: "bbb",
          size: "12",
        },
      });
    });

    test.each<[string, string | null]>([
      ["0.10.0", null],
      ["0.11.0", "0.11.0"],
      ["0.11.1", "0.11.0"],
      ["0.12.0", "0.12.1"],
      ["0.12.1", "0.12.1"],
      ["0.13.0", "0.13.0"],
      ["0.14.0", null],
      ["0.11.0-dev.1+aaaaaaaaa", null],
      ["0.12.0-dev.1+aaaaaaaaa", "0.12.0-dev.1+aaaaaaaaa"],
      ["0.12.0-dev.2+aaaaaaaaa", "0.12.0-dev.1+aaaaaaaaa"],
      ["0.12.0-dev.5+aaaaaaaaa", "0.12.0-dev.1+aaaaaaaaa"],
      ["0.12.0-dev.6+aaaaaaaaa", "0.12.0-dev.1+aaaaaaaaa"],
      ["0.12.0-dev.7+aaaaaaaaa", "0.12.0-dev.2+aaaaaaaaa"],
      ["0.12.0-dev.8+aaaaaaaaa", "0.12.0-dev.2+aaaaaaaaa"],
      // ["0.12.0-dev.9+aaaaaaaaa", null],
      // ["0.12.0-dev.10+aaaaaaaaa", null],
      // ["0.12.0-dev.13+aaaaaaaaa", null],
    ])("Zig %s -> ZLS %s", async (zigVersion, expectedZLSVersion) => {
      const response = await selectZLSVersion(zigVersion);
      expect(response?.version ?? null).toBe(expectedZLSVersion);
    });
  });
});
