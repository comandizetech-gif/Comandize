function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 max-w-xl w-full text-center">
        <img
          src="/icons/Comandize.png"
          alt="Comandize"
          className="w-40 mx-auto mb-6"
        />

        <h1 className="text-3xl font-black text-gray-800 mb-3">
          COMANDIZE
        </h1>

        <p className="text-gray-600 mb-6">
          Sistema de catálogo online, delivery e gestão para restaurantes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl"
          >
            Entrar no painel
          </a>

          <a
            href="/login"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black px-6 py-3 rounded-xl"
          >
            Criar conta
          </a>
        </div>
      </div>
    </div>
  );
}

export default HomePage;