import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logoutSession, startSession } from "../../api/auth/session";
import { getEmployeePhotoBlob } from "../../api/employee/employeePhotos";
import EmployeeApprovedPhoto from "./EmployeeApprovedPhoto";
vi.mock("../../api/employee/employeePhotos", () => ({
  getEmployeePhotoBlob: vi.fn(),
}));
const id = "11111111-1111-4111-8111-111111111111",
  photo = "22222222-2222-4222-8222-222222222222",
  next = "33333333-3333-4333-8333-333333333333";
const jwt = (sub: number) =>
  "e30." +
  btoa(JSON.stringify({ sub, role: "secretary", exp: 4102444800 })).replace(
    /=+$/,
    "",
  ) +
  ".c2ln";
const originalCreate = URL.createObjectURL,
  originalRevoke = URL.revokeObjectURL;
let count = 0;
beforeEach(() => {
  count = 0;
  logoutSession();
  startSession(jwt(1));
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:approved-" + ++count),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.mocked(getEmployeePhotoBlob)
    .mockReset()
    .mockResolvedValue(new Blob(["synthetic"], { type: "image/png" }));
});
afterEach(() => {
  cleanup();
  logoutSession();
  if (originalCreate)
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreate,
    });
  else Reflect.deleteProperty(URL, "createObjectURL");
  if (originalRevoke)
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevoke,
    });
  else Reflect.deleteProperty(URL, "revokeObjectURL");
});
describe("Fotografia aprovada privada", () => {
  it("não consulta foto ausente nem identificador que não seja do contrato", () => {
    const { rerender } = render(
      <EmployeeApprovedPhoto employeeId={id} name="Pessoa" detail />,
    );
    expect(
      screen.getByRole("img", { name: "Sem foto aprovada de Pessoa" }),
    ).toBeInTheDocument();
    rerender(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId="https://outside.example/photo"
        name="Pessoa"
        detail
      />,
    );
    expect(getEmployeePhotoBlob).not.toHaveBeenCalled();
  });
  it("carrega pela identidade privada e permite ampliar sem URL de armazenamento", async () => {
    render(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId={photo}
        name="Pessoa"
        detail
      />,
    );
    expect(
      await screen.findByRole("img", { name: "Foto aprovada de Pessoa" }),
    ).toHaveAttribute("src", "blob:approved-1");
    expect(getEmployeePhotoBlob).toHaveBeenCalledWith(
      { employeeId: id, photoId: photo },
      expect.any(AbortSignal),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ampliar foto aprovada de Pessoa" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Foto aprovada de Pessoa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Foto aprovada ampliada de Pessoa" }),
    ).toHaveAttribute("src", "blob:approved-1");
    fireEvent.click(screen.getByRole("button", { name: "Fechar foto" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("falha individual mostra placeholder e permite tentar novamente", async () => {
    vi.mocked(getEmployeePhotoBlob).mockRejectedValueOnce(
      new Error("Storage unavailable"),
    );
    render(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId={photo}
        name="Pessoa"
        detail
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Tentar carregar foto" }),
    );
    expect(
      await screen.findByRole("img", { name: "Foto aprovada de Pessoa" }),
    ).toBeInTheDocument();
  });
  it("descarta download tardio e revoga URLs ao trocar a fotografia", async () => {
    let finish!: (value: Blob) => void;
    vi.mocked(getEmployeePhotoBlob).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender, unmount } = render(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId={photo}
        name="Pessoa"
      />,
    );
    const signal = vi.mocked(getEmployeePhotoBlob).mock.calls[0][1];
    rerender(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId={next}
        name="Pessoa"
      />,
    );
    await screen.findByRole("img", { name: "Foto aprovada de Pessoa" });
    await act(async () => finish(new Blob(["old"], { type: "image/png" })));
    expect(signal.aborted).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:approved-1");
  });
  it("troca de sessão remove foto anterior e logout fecha a ampliação", async () => {
    render(
      <EmployeeApprovedPhoto
        employeeId={id}
        approvedPhotoId={photo}
        name="Pessoa"
        detail
      />,
    );
    await screen.findByRole("img", { name: "Foto aprovada de Pessoa" });
    act(() => startSession(jwt(2)));
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "Foto aprovada de Pessoa" }),
      ).toHaveAttribute("src", "blob:approved-2"),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:approved-1");
    fireEvent.click(
      screen.getByRole("button", { name: "Ampliar foto aprovada de Pessoa" }),
    );
    act(() => logoutSession());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Foto aprovada de Pessoa" }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:approved-2");
  });
});
