export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="hero bg-base-200 rounded-box p-6">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="py-6">Gestiona tu restaurante, menú y pedidos desde aquí.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Pedidos</h2>
            <p>Ver y gestionar pedidos en tiempo real</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Ir a pedidos</button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Menú</h2>
            <p>Administrar platillos y categorías</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Editar menú</button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Configuración</h2>
            <p>Mensajes, horarios y flujo del bot</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Configurar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
