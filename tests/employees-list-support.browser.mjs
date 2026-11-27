import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { preview } from "vite";
const employeeDir = resolve(
  process.env.EMPLOYEE_PORTAL_DIR || "../funcionarios",
);
const { chromium } = createRequire(join(employeeDir, "package.json"))(
  "playwright",
);
const image = await readFile(join(employeeDir, "public/perfil_default.png"));
const base = "http://localhost:4310",
  api = "http://localhost:3099";
const output = resolve(
  process.env.UX_EVIDENCE_DIR ||
    "../../outputs/funcionarios-lista-importacao-suporte",
);
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
const id = "11111111-1111-4111-8111-111111111111",
  photoId = "22222222-2222-4222-8222-222222222222";
const employee = {
  id,
  accountId: 1,
  name: "Pessoa Exemplo",
  displayName: "Pessoa Exemplo",
  email: "pessoa@example.test",
  registrationNumber: "FUNC-001",
  accountStatus: "ACTIVE",
  assignmentTitles: ["Docente"],
  version: 1,
  assignments: [],
  photo: {
    approvedPhotoId: photoId,
    pendingPhotoId: null,
    reviewStatus: "APPROVED",
  },
};
const statuses = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_STUDENT",
  "RESOLVED",
  "CLOSED",
];
const tickets = statuses.map((status, i) => ({
  id: "ticket-" + i,
  subject: "Solicitação " + status,
  protocol: "SUP-" + i,
  category: "DATA",
  status,
  version: 2,
  unread: false,
  studentName: "Pessoa fictícia",
  studentRa: "123",
  assignedSecretaryId: 1,
  assigneeName: "Secretaria",
  createdAt: "2026-11-01T12:00:00Z",
  eventId: null,
  certificateId: null,
}));
const server = await preview({ preview: { port: 4310, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  await mkdir(output, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      serviceWorkers: "block",
    });
    context.setDefaultTimeout(20000);
    context.setDefaultNavigationTimeout(120000);
    await context.addInitScript((t) => localStorage.setItem("token", t), token);
    const calls = [];
    let failPhoto = false;
    await context.route("**/*", (r) =>
      new URL(r.request().url()).origin === base ? r.continue() : r.abort(),
    );
    await context.route(api + "/**", async (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        p = u.pathname;
      const headers = {
        "access-control-allow-origin": base,
        "access-control-allow-headers":
          "authorization,content-type,cache-control",
        "access-control-allow-methods": "GET,OPTIONS",
      };
      const reply = (json, status = 200) =>
        r.fulfill({ json, status, headers });
      if (req.method() === "OPTIONS")
        return r.fulfill({ status: 204, headers });
      assert.equal(
        req.method(),
        "GET",
        "Nenhuma escrita permitida neste cenário",
      );
      assert.equal(req.headers().authorization, "Bearer " + token);
      calls.push(p + u.search);
      if (p === "/estudantes/listar-todos")
        return reply([
          {
            ra: "9999999999999",
            name: "Aluno Exemplo",
            email: "aluno@example.test",
            cpf: "00000000000",
            admission: "20261",
            course: "Curso de teste",
            status: "Em curso",
            photo: "data:image/png;base64," + image.toString("base64"),
            photoStatus: "APPROVED",
          },
        ]);
      if (p === "/secretaria/fotos-pendentes") return reply([]);
      if (p === "/funcionarios/fotos/resumo") return reply({ pendingCount: 0 });
      if (p === "/support/admin/summary") return reply({ pending: 1 });
      if (p === "/support/admin/assignees")
        return reply([{ id: 1, name: "Secretaria" }]);
      if (p === "/support/admin/tickets") {
        const s = u.searchParams.get("status");
        return reply({
          items: tickets.filter((t) => !s || t.status === s),
          nextCursor: null,
        });
      }
      if (p === "/funcionarios")
        return reply({
          items:
            u.searchParams.get("q") === "inexistente"
              ? []
              : [
                  employee,
                  {
                    ...employee,
                    id: "33333333-3333-4333-8333-333333333333",
                    name: "Pessoa Sem Foto",
                    displayName: "Pessoa Sem Foto",
                    registrationNumber: "FUNC-002",
                    photo: {
                      approvedPhotoId: null,
                      pendingPhotoId: "44444444-4444-4444-8444-444444444444",
                      reviewStatus: "PENDING",
                    },
                  },
                ],
          nextCursor: null,
        });
      if (p === "/funcionarios/" + id) return reply(employee);
      if (p === "/funcionarios/" + id + "/acesso")
        return reply({ status: "ACTIVE", activatedAt: "2026-11-01T12:00:00Z" });
      if (p === "/funcionarios/" + id + "/fotos/" + photoId + "/conteudo")
        return failPhoto
          ? reply({ message: "Indisponível" }, 503)
          : r.fulfill({ body: image, contentType: "image/png", headers });
      throw Error("Rota inesperada " + p);
    });
    const page = await context.newPage();
    const capture = async (name) => {
      assert(
        await page.locator("body").evaluate((e) => e.scrollWidth <= innerWidth),
        "Sem transbordamento da página",
      );
      await page.screenshot({
        path: join(output, name + "-" + width + ".png"),
        fullPage: true,
        animations: "disabled",
      });
    };
    await page.goto(base + "/funcionarios");
    await page
      .getByRole("link", { name: "Pessoa Exemplo", exact: true })
      .waitFor();
    await page
      .getByAltText("Foto aprovada de Pessoa Exemplo", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByAltText("Foto aprovada de Pessoa Exemplo", { exact: true })
        .evaluate((e) => e.naturalWidth > 0),
      true,
    );
    assert.equal(
      calls.some((x) => x.includes("44444444")),
      false,
      "Foto pendente nunca baixada",
    );
    await capture("lista-funcionarios");
    const tableStyles = () =>
      page.locator("table").evaluate((el) => {
        const th = getComputedStyle(el.querySelector("th"));
        const td = getComputedStyle(el.querySelector("tbody td"));
        return {
          headerPadding: th.padding,
          headerColor: th.backgroundColor,
          headerFont: th.fontSize,
          cellPadding: td.padding,
          cellFont: td.fontSize,
        };
      });
    const actualStyles = await tableStyles();
    await page.goto(base + "/students");
    await page
      .getByRole("button", { name: "Editar aluno Aluno Exemplo" })
      .waitFor();
    assert.deepEqual(
      await tableStyles(),
      actualStyles,
      "Mesmos estilos computados da tabela de alunos",
    );
    await capture("referencia-alunos");
    await page.goto(base + "/funcionarios");
    await page
      .getByRole("link", { name: "Pessoa Exemplo", exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "Importar Funcionários", exact: true })
      .click();
    assert(await page.locator("input[type=file]").isDisabled());
    assert.equal(
      await page.locator("input[type=file]").getAttribute("accept"),
      null,
    );
    await capture("importacao-preparacao");
    await page.goto(base + "/funcionarios/" + id);
    await page
      .getByRole("button", { name: "Ampliar foto aprovada de Pessoa Exemplo" })
      .click();
    await page
      .getByAltText("Foto aprovada ampliada de Pessoa Exemplo")
      .waitFor();
    await capture("foto-ampliada");
    await page.goto(base + "/funcionarios");
    await page
      .getByLabel("Nome, e-mail ou matrícula funcional")
      .fill("inexistente");
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await page
      .getByRole("link", { name: "Pessoa Exemplo", exact: true })
      .waitFor({ state: "hidden" });
    await page.goto(base + "/suporte");
    const select = page.getByRole("combobox", { name: /^Situação/ });
    await select.waitFor();
    assert.equal(await select.inputValue(), "OPEN");
    await page.getByText("Solicitação OPEN", { exact: true }).waitFor();
    await capture("suporte-em-aberto");
    for (const status of statuses) {
      await select.selectOption(status);
      await page.getByText("Solicitação " + status, { exact: true }).waitFor();
      assert.equal(
        calls
          .filter((x) => x.startsWith("/support/admin/tickets"))
          .at(-1)
          .includes("status=" + status),
        true,
      );
    }
    await select.selectOption("");
    await page.getByText("Solicitação OPEN", { exact: true }).waitFor();
    assert.equal(
      new URL(
        api +
          calls.filter((x) => x.startsWith("/support/admin/tickets")).at(-1),
      ).searchParams.has("status"),
      false,
    );
    await capture("suporte-todos");
    failPhoto = true;
    await page.goto(base + "/funcionarios");
    await page
      .getByRole("link", { name: "Pessoa Exemplo", exact: true })
      .waitFor();
    await page.waitForTimeout(300);
    assert.equal(
      await page
        .getByAltText("Foto aprovada de Pessoa Exemplo", { exact: true })
        .count(),
      0,
    );
    await context.close();
    console.log(
      "PASS " +
        width +
        ": lista, fotos privadas, detalhe/modal, importação inerte, busca e cinco filtros + Todos (API simulada).",
    );
  }
} finally {
  await browser?.close();
  await new Promise((done) => server.httpServer.close(done));
}
