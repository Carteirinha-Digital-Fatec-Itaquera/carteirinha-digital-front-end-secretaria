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
const base = "http://localhost:4288",
  api = "http://localhost:3099";
const evidence = process.env.UX_EVIDENCE_DIR;
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const token =
  encode({ alg: "HS256" }) +
  "." +
  encode({
    sub: 1,
    role: "secretary",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }) +
  "." +
  Buffer.from("synthetic-signature").toString("base64url");
const fixture = {
  photoId: "photo-test",
  employeeId: "employee-test",
  employeeName: "Pessoa de Teste",
  displayName: "Pessoa de Teste",
  registrationNumber: "FOTO-TESTE",
  employeeVersion: 7,
  createdAt: "2026-11-24T12:00:00Z",
  contentUrl: "/nao-utilizar",
};
const server = await preview({ preview: { port: 4288, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  if (evidence) await mkdir(evidence, { recursive: true });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
    });
    context.setDefaultTimeout(12000);
    await context.addInitScript(
      (value) => localStorage.setItem("token", value),
      token,
    );
    const state = { pending: true, mode: "ok", patches: 0 };
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await context.route(api + "/**", async (route) => {
      const req = route.request(),
        p = new URL(req.url()).pathname,
        m = req.method();
      const headers = {
        "access-control-allow-origin": base,
        "access-control-allow-headers":
          "authorization,content-type,cache-control",
        "access-control-allow-methods": "GET,PATCH,OPTIONS",
      };
      const reply = (json, status = 200) =>
        route.fulfill({ json, status, headers });
      if (m === "OPTIONS") return route.fulfill({ status: 204, headers });
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
        return reply({ pendingCount: state.pending ? 1 : 0 });
      if (p === "/funcionarios/fotos/pendentes")
        return reply({
          items: state.pending ? [fixture] : [],
          nextCursor: null,
        });
      if (p.endsWith("/conteudo"))
        return route.fulfill({
          body: image,
          contentType: "image/png",
          headers,
        });
      if (p.endsWith("/avaliacao")) {
        state.patches++;
        assert.equal(req.postDataJSON().expectedVersion, 7);
        if (state.mode === "conflict")
          return reply(
            { code: "PHOTO_VERSION_CONFLICT", message: "Conflito de versão" },
            409,
          );
        if (state.mode === "invalid") return reply({});
        if (state.mode === "network") return route.abort("failed");
        if (state.mode === "expired")
          return reply({ message: "Sessão expirada." }, 401);
        if (!req.postDataJSON().approved)
          assert(req.postDataJSON().reason.length >= 3);
        state.pending = false;
        return reply({
          id: fixture.employeeId,
          version: 8,
          photo: {
            approvedPhotoId: req.postDataJSON().approved
              ? fixture.photoId
              : null,
            pendingPhotoId: null,
            reviewStatus: req.postDataJSON().approved ? "APPROVED" : "REJECTED",
          },
        });
      }
      if (p.endsWith("/summary")) return reply({ pending: 0 });
      throw Error("Rota inesperada " + p);
    });
    const page = await context.newPage();
    const capture = async (name) => {
      if (!evidence) return;
      assert(
        await page
          .locator("body")
          .evaluate((el) => el.scrollWidth <= innerWidth),
      );
      await page.screenshot({
        path: join(evidence, name + "-" + viewport.width + ".png"),
        fullPage: !name.includes("sucesso"),
        animations: "disabled",
      });
    };
    await page.goto(base + "/fotos");
    await page
      .getByRole("checkbox", { name: "Selecionar foto de Aluno de Teste" })
      .waitFor();
    const size = () =>
      page
        .getByRole("button", { name: "Ampliar foto de Aluno de Teste" })
        .boundingBox();
    const student = await size();
    await capture("secretaria-alunos");
    await page
      .getByRole("button", { name: "Funcionários (1)", exact: true })
      .click();
    const thumb = page.getByRole("button", {
      name: "Ampliar foto de Pessoa de Teste",
    });
    await thumb.waitFor();
    const employee = await thumb.boundingBox();
    assert.equal(employee.height, student.height);
    assert(
      Math.abs(employee.width - student.width) <= 10,
      "Prévia equivalente à do aluno",
    );
    await capture("secretaria-funcionarios");
    await thumb.click();
    await page
      .getByRole("img", { name: "Foto completa de Pessoa de Teste" })
      .waitFor();
    await capture("secretaria-ampliada");
    await page
      .getByRole("button", { name: "Fechar visualização da foto" })
      .click();
    await page
      .getByRole("button", { name: "Aprovar foto", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar aprovação" }).click();
    await page
      .getByText("Foto aprovada com sucesso!", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "OK",
    );
    await capture("secretaria-sucesso-aprovacao");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page
      .getByRole("button", { name: "Funcionários (0)", exact: true })
      .waitFor();
    state.pending = true;
    await page.getByRole("button", { name: "Atualizar pendências" }).click();
    await page
      .getByRole("button", { name: "Reprovar foto", exact: true })
      .click();
    assert.equal(state.patches, 1);
    await page
      .getByRole("textbox", { name: "Motivo da reprovação (opcional)" })
      .fill("Imagem sintética fora do enquadramento.");
    await page.getByRole("button", { name: "Confirmar reprovação" }).click();
    await page
      .getByText("Foto reprovada com sucesso!", { exact: true })
      .waitFor();
    await capture("secretaria-sucesso-rejeicao");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    for (const mode of ["conflict", "invalid", "network"]) {
      state.pending = true;
      state.mode = mode;
      await page.getByRole("button", { name: "Atualizar pendências" }).click();
      await page
        .getByRole("button", { name: "Aprovar foto", exact: true })
        .click();
      await page.getByRole("button", { name: "Confirmar aprovação" }).click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByText("Foto aprovada com sucesso!", { exact: true })
          .count(),
        0,
      );
      await page.getByRole("button", { name: "OK", exact: true }).click();
    }
    state.mode = "expired";
    await page
      .getByRole("button", { name: "Aprovar foto", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar aprovação" }).click();
    await page.getByText("Login secretaria", { exact: true }).waitFor();
    await context.close();
    console.log(
      "Secretaria " +
        viewport.width +
        ": prévias, modais, erros e sessão aprovados com API simulada",
    );
  }
} finally {
  await browser?.close();
  await new Promise((done) => server.httpServer.close(done));
}
