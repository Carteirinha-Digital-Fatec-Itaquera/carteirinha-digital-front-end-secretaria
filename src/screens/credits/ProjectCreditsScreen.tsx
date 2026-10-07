import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { getProjectCredits } from "../../api/projectCredits/projectCreditsService";
import type {
  ProjectCreditContributor,
  ProjectCreditsResponse,
} from "../../domains/ProjectCredits";
import { isApprovedProjectCreditHref } from "../../utils/projectCreditContact";
import styles from "./styleProjectCredits.module.css";

function formatSemester(semester: string): string {
  const match = /^(\d{4})\.([12])$/.exec(semester);
  return match ? match[2] + "º semestre de " + match[1] : semester;
}

function sortSemesters(semesters: string[]): string[] {
  return [...new Set(semesters)].sort((left, right) =>
    right.localeCompare(left),
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toLocaleUpperCase('pt-BR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('pt-BR');
}

function ContributorAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      <div className={styles.avatar}>
        <img
          src={photoUrl}
          alt={'Foto de ' + name}
          className={styles.avatarImage}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={styles.avatar} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}

function ContributorsList({
  contributors,
  semester,
}: {
  contributors: ProjectCreditContributor[];
  semester: string;
}) {
  const visibleContributors = contributors.filter(
    (person) =>
      semester === "all" ||
      person.participations.some(
        (participation) => participation.semester === semester,
      ),
  );

  if (visibleContributors.length === 0) {
    return (
      <section className={styles.emptyState} aria-live="polite">
        <UsersRound size={36} className={styles.emptyIcon} aria-hidden="true" />
        <h2>Créditos em organização</h2>
        <p>
          A lista histórica será publicada depois de validarmos as participações
          de cada semestre.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.list}>
      {visibleContributors.map((person) => {
        const participations = person.participations.filter(
          (participation) =>
            semester === "all" || participation.semester === semester,
        );

        return (
          <article key={person.id} className={styles.card}>
            <ContributorAvatar name={person.name} photoUrl={person.photoUrl} />
            <div className={styles.cardContent}>
              <h2>{person.name}</h2>
              {participations.map((participation) => (
                <section
                  key={participation.semester}
                  className={styles.participation}
                >
                  <h3>{formatSemester(participation.semester)}</h3>
                  {participation.course && (
                    <span className={styles.courseText}>
                      {participation.course}
                    </span>
                  )}
                  <ul className={styles.roles} aria-label="Papéis no projeto">
                    {participation.roles.map((role) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ul>
                  {participation.contribution && (
                    <p>{participation.contribution}</p>
                  )}
                </section>
              ))}
              {person.contacts.some(isApprovedProjectCreditHref) && (
                <nav
                  className={styles.contacts}
                  aria-label={"Contatos profissionais de " + person.name}
                >
                  {person.contacts
                    .filter(isApprovedProjectCreditHref)
                    .map((contact) => (
                      <a
                        key={contact.href}
                        className={styles.contactLink}
                        href={contact.href}
                        {...(contact.kind === "email"
                          ? {}
                          : { target: "_blank", rel: "noopener noreferrer" })}
                      >
                        {contact.label}
                      </a>
                    ))}
                </nav>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ProjectCreditsScreen() {
  const location = useLocation();
  const requestedReturn = (location.state as { from?: unknown } | null)?.from;
  const backTo =
    typeof requestedReturn === "string" &&
    ["/students", "/eventos", "/perfil"].includes(requestedReturn)
      ? requestedReturn
      : "/login";
  const [resource, setResource] = useState<ProjectCreditsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getProjectCredits(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setResource(response);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError(false);
    setAttempt((current) => current + 1);
  };

  const semesters = useMemo(
    () =>
      sortSemesters(
        (resource?.contributors ?? []).flatMap((person) =>
          person.participations.map((item) => item.semester),
        ),
      ),
    [resource],
  );
  const [semester, setSemester] = useState("all");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to={backTo} className={styles.backLink}>
          Voltar
        </Link>
        <div className={styles.brand}>
          <img
            src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png"
            alt="FATEC Itaquera"
          />
          <span>Secretaria acadêmica</span>
        </div>
        <h1>Créditos do projeto</h1>
        <p className={styles.intro}>
          Cada semestre deixa sua marca na Carteirinha Digital. Conheça quem
          ajudou a construir este projeto.
        </p>
      </header>

      <div className={styles.content}>
        <section
          className={styles.headingSurface}
          aria-labelledby="credits-history-title"
        >
          <span className={styles.eyebrow}>Nossa história</span>
          <div className={styles.sectionHeading}>
            <h2 id="credits-history-title">Quem constrói o projeto</h2>
            <p>
              Reconhecemos pessoas e contribuições de diferentes etapas do
              projeto.
            </p>
          </div>
        </section>
        {semesters.length > 0 && (
          <div
            className={styles.filters}
            role="group"
            aria-label="Filtrar créditos por semestre"
          >
            <button
              type="button"
              aria-pressed={semester === "all"}
              onClick={() => setSemester("all")}
            >
              Todos os semestres
            </button>
            {semesters.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={semester === value}
                onClick={() => setSemester(value)}
              >
                {formatSemester(value)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p role="status" className={styles.message}>
            Carregando créditos do projeto...
          </p>
        ) : error ? (
          <section className={styles.errorState} role="alert">
            <p>
              Não foi possível carregar os créditos. Confira sua conexão e tente
              novamente.
            </p>
            <button type="button" onClick={retry}>
              Tentar novamente
            </button>
          </section>
        ) : (
          <ContributorsList
            contributors={resource?.contributors ?? []}
            semester={semester}
          />
        )}

        <p className={styles.footerNote}>
          A equipe confirma cada participação e cada contato profissional antes
          da publicação.
        </p>
      </div>
    </main>
  );
}
