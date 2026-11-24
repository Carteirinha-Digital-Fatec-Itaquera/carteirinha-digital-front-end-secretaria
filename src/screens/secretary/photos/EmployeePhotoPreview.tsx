import { useEffect, useState } from "react";
import {
  getEmployeePhotoBlob,
  type PendingEmployeePhoto,
} from "../../../api/employee/employeePhotos";
import PendingPhotoPreview from "./PendingPhotoPreview";

export default function EmployeePhotoPreview({
  photo,
}: {
  photo: PendingEmployeePhoto;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    photoId: string;
    url?: string;
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void getEmployeePhotoBlob(photo, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setResult({ photoId: photo.photoId, url });
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted)
          setResult({ photoId: photo.photoId, error: cause.message });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo, attempt]);
  const current = result?.photoId === photo.photoId ? result : undefined;
  if (current?.error)
    return (
      <div role="alert">
        <p>{current.error}</p>
        <button
          onClick={() => {
            setResult(undefined);
            setAttempt((value) => value + 1);
          }}
        >
          Tentar carregar foto
        </button>
      </div>
    );
  if (!current?.url) return <p role="status">Carregando foto privada…</p>;
  return <PendingPhotoPreview src={current.url} name={photo.displayName} />;
}
