import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { preview } from "vite";
const employeeDir = resolve(
  process.env.EMPLOYEE_PORTAL_DIR ||
    "../carteirinha-digital-front-end-funcionarios",
);
const { chromium } = createRequire(join(employeeDir, "package.json"))(
  "playwright",
);
const image = await readFile(join(employeeDir, "public/perfil_default.png"));
const base = "http://localhost:4289",
  api = "http://localhost:3099",
  output = process.env.BATCH_EVIDENCE_DIR;
const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const token =
  enc({ alg: "HS256" }) +
  "." +
  enc({
    sub: 1,
    role: "secretary",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }) +
  "." +
  Buffer.from("synthetic-signature").toString("base64url");
const fixtures = () =>
  ["A", "B", "C"].map((name, index) => ({
    employeeId: "employee-" + name,
    photoId: "photo-" + name,
    employeeName: "Pessoa " + name,
    displayName: "Pessoa " + name,
    registrationNumber: "MATR-" + name,
    employeeVersion: 4 + index * 3,
    createdAt: "2026-11-24T12:00:00Z",
    contentUrl: "/nao-usar",
  }));
const server = await preview({ preview: { port: 4289, strictPort: true } });
let browser;
try {
  if (output) await mkdir(output, { recursive: true });
  browser = await chromium.launch();
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      serviceWorkers: "block",
    });
    context.setDefaultTimeout(15000);
    await context.addInitScript(
      (value) => localStorage.setItem("token", value),
      token,
    );
    const state = { active: fixtures(), reviews: [], mode: "ok" };
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await context.route(api + "/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname;
      const headers = {
        "access-control-allow-origin": base,
        "access-control-allow-headers":
          "authorization,content-type,cache-control",
        "access-control-allow-methods": "GET,PATCH,OPTIONS",
      };
      const reply = (json, status = 200) =>
        route.fulfill({ json, status, headers });
      if (req.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      assert.equal(req.headers().authorization, "Bearer " + token);
      if (p === "/secretaria/fotos-pendentes")
        return reply([
          {
            ra: "9999999999999",
            name: "Aluno de Teste",
            email: "aluno@example.test",
            photo: "data:image/png;base64," + image.toString("base64"),
          },
        ]);
      if (p === "/funcionarios/fotos/resumo")
        return reply({ pendingCount: state.active.length });
      if (p === "/funcionarios/fotos/pendentes") {
        const offset = Number(url.searchParams.get("cursor") || 0);
        return reply({
          items: state.active.slice(offset, offset + 2),
          nextCursor:
            offset + 2 < state.active.length ? String(offset + 2) : null,
        });
      }
      if (p.endsWith("/conteudo"))
        return route.fulfill({
          body: image,
          contentType: "image/png",
          headers,
        });
      if (p.endsWith("/avaliacao")) {
        const photo = state.active.find((item) =>
          p.includes("/" + item.employeeId + "/fotos/" + item.photoId + "/"),
        );
        assert(photo);
        const input = req.postDataJSON();
        assert.equal(input.expectedVersion, photo.employeeVersion);
        state.reviews.push({ id: photo.photoId, ...input });
        if (state.mode === "expired")
          return reply({ message: "Sessão expirada." }, 401);
        if (state.mode === "network") return route.abort("failed");
        if (state.mode === "invalid") return reply({});
        if (state.mode === "partial" && photo.photoId === "photo-B") {
          photo.employeeVersion++;
          return reply(
            { message: "Alteração simultânea", code: "PHOTO_VERSION_CONFLICT" },
            409,
          );
        }
        state.active = state.active.filter(
          (item) => item.photoId !== photo.photoId,
        );
        return reply({
          id: photo.employeeId,
          version: photo.employeeVersion + 1,
          photo: {
            approvedPhotoId: input.approved ? photo.photoId : null,
            pendingPhotoId: null,
            reviewStatus: input.approved ? "APPROVED" : "REJECTED",
            latestAttempt: {
              photoId: photo.photoId,
              reviewStatus: input.approved ? "APPROVED" : "REJECTED",
              reviewReason: input.reason ?? null,
            },
          },
        });
      }
      if (p.endsWith("/summary")) return reply({ pending: 0 });
      throw Error("Rota inesperada " + p);
    });
    const page = await context.newPage();
    const button = (name) => page.getByRole("button", { name, exact: true });
    const capture = async (name) => {
      assert(
        await page
          .locator("body")
          .evaluate((el) => el.scrollWidth <= innerWidth),
        "Sem overflow " + name + " " + width,
      );
      if (output)
        await page.screenshot({
          path: join(resolve(output), name + "-" + width + ".png"),
          fullPage: !name.includes("resultado"),
          animations: "disabled",
        });
    };
    const refresh = async (rows = fixtures(), mode = "ok") => {
      state.active = rows;
      state.mode = mode;
      state.reviews = [];
      await button("Atualizar pendências").click();
      await page
        .getByRole("heading", { name: rows[0].displayName, exact: true })
        .waitFor();
      if (await button("Carregar mais fotografias").count())
        await button("Carregar mais fotografias").click();
      await button("Selecionar todos").waitFor();
    };
    const selectAll = async (number) => {
      await button("Selecionar todos").click();
      await button("Aprovar selecionados (" + number + ")").waitFor();
    };
    await page.goto(base + "/fotos");
    await page
      .getByRole("checkbox", { name: "Selecionar foto de Aluno de Teste" })
      .waitFor();
    await button("Funcionários (3)").click();
    const first = page.getByRole("article", { name: "Fotografia de Pessoa A" });
    await first.waitFor();
    const approve = await first
        .getByRole("button", { name: "Aprovar foto" })
        .boundingBox(),
      reject = await first
        .getByRole("button", { name: "Reprovar foto" })
        .boundingBox();
    assert(Math.abs(approve.y - reject.y) < 1, "Botões lado a lado");
    assert(approve.x + approve.width <= reject.x);
    await page
      .getByRole("checkbox", { name: "Selecionar foto de Pessoa A" })
      .check();
    await button("Aprovar selecionados (1)").waitFor();
    await button("Desselecionar todos").click();
    assert(await button("Aprovar selecionados (0)").isDisabled());
    await selectAll(2);
    await button("Carregar mais fotografias").click();
    await page
      .getByRole("heading", { name: "Pessoa C", exact: true })
      .waitFor();
    await button("Aprovar selecionados (2)").waitFor();
    await selectAll(3);
    await capture("secretaria-selecao-multipla");
    await first
      .getByRole("button", { name: "Ampliar foto de Pessoa A" })
      .click();
    await page
      .getByRole("img", { name: "Foto completa de Pessoa A" })
      .waitFor();
    await button("Fechar visualização da foto").click();
    assert.equal(
      await page.getByRole("checkbox", { checked: true }).count(),
      3,
    );
    await button("Aprovar selecionados (3)").click();
    await page
      .getByText("3 fotografia(s) selecionada(s).", { exact: true })
      .waitFor();
    await button("Cancelar").click();
    assert.equal(state.reviews.length, 0);
    await button("Aprovar selecionados (3)").click();
    await button("Confirmar aprovação").click();
    await page
      .getByText("Fotos aprovadas com sucesso!", { exact: true })
      .waitFor();
    assert.equal(state.reviews.length, 3);
    await capture("secretaria-resultado-aprovacao-lote");
    await button("OK").click();
    await button("Funcionários (0)").waitFor();
    for (const reason of ["", "  Enquadramento inadequado.  "]) {
      await refresh();
      await selectAll(3);
      await button("Reprovar selecionados (3)").click();
      const input = page.getByRole("textbox", {
        name: "Motivo da reprovação (opcional)",
      });
      assert.equal(await input.getAttribute("required"), null);
      await input.fill(reason);
      await button("Confirmar reprovação").click();
      await page
        .getByText("Fotos reprovadas com sucesso!", { exact: true })
        .waitFor();
      assert.equal(state.reviews.length, 3);
      assert(
        state.reviews.every((item) =>
          reason
            ? item.reason === reason.trim()
            : !Object.hasOwn(item, "reason"),
        ),
      );
      await capture(
        reason
          ? "secretaria-resultado-reprovacao-motivo"
          : "secretaria-resultado-reprovacao-sem-motivo",
      );
      await button("OK").click();
    }
    await refresh(fixtures(), "partial");
    await selectAll(3);
    await button("Aprovar selecionados (3)").click();
    await button("Confirmar aprovação").click();
    await page
      .getByText("2 avaliação(ões) concluída(s); 1 não concluída(s).", {
        exact: true,
      })
      .waitFor();
    await page.getByText(/Pessoa B: Conflito de versão/).waitFor();
    assert.equal(state.reviews.length, 3);
    await capture("secretaria-resultado-parcial");
    await button("OK").click();
    assert(await button("Aprovar selecionados (0)").isDisabled());
    state.mode = "ok";
    const remaining = page.getByRole("article", {
      name: "Fotografia de Pessoa B",
    });
    await remaining.getByRole("button", { name: "Reprovar foto" }).click();
    await button("Confirmar reprovação").click();
    await page
      .getByText("Foto reprovada com sucesso!", { exact: true })
      .waitFor();
    assert.equal(state.reviews.at(-1).expectedVersion, 8);
    assert(!Object.hasOwn(state.reviews.at(-1), "reason"));
    await button("OK").click();
    for (const mode of ["invalid", "network"]) {
      await refresh([fixtures()[0]], mode);
      await button("Aprovar foto").click();
      await button("Confirmar aprovação").click();
      await page
        .getByText("0 avaliação(ões) concluída(s); 1 não concluída(s).", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByText("Foto aprovada com sucesso!", { exact: true })
          .count(),
        0,
      );
      await button("OK").click();
    }
    await refresh(fixtures(), "expired");
    await selectAll(3);
    await button("Aprovar selecionados (3)").click();
    await button("Confirmar aprovação").click();
    await page.getByText("Login secretaria", { exact: true }).waitFor();
    assert.equal(state.reviews.length, 1);
    await context.close();
    console.log(
      "Secretaria " +
        width +
        ": seleção, versões, lotes, motivo opcional, parciais e sessão aprovados com API simulada",
    );
  }
} finally {
  await browser?.close();
  await new Promise((done) => server.httpServer.close(done));
}
