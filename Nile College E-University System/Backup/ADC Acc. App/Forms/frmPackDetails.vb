Imports System.Data.SqlClient
Public Class frmPackDetails
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents btnSave As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmPackDetails))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.btnSave = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.ComboBox1)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 6)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(222, 56)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "«·Õ“„…"
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.DropDownWidth = 250
        Me.ComboBox1.Location = New System.Drawing.Point(12, 24)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(204, 21)
        Me.ComboBox1.Sorted = True
        Me.ComboBox1.TabIndex = 68
        '
        'GroupBox2
        '
        Me.GroupBox2.Location = New System.Drawing.Point(6, 69)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(222, 3)
        Me.GroupBox2.TabIndex = 68
        Me.GroupBox2.TabStop = False
        '
        'btnSave
        '
        Me.btnSave.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnSave.Location = New System.Drawing.Point(130, 78)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(75, 32)
        Me.btnSave.TabIndex = 67
        Me.btnSave.Text = "⁄—÷"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(30, 78)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 69
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'frmPackDetails
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(235, 117)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.btnSave)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "frmPackDetails"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = " ›«’Ì· «·Õ“„"
        Me.GroupBox1.ResumeLayout(False)
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub frmPackDetails_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox1.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ComboBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSave.Click
        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ“„…")
            Me.ComboBox1.Focus()
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            Dim strSel As String

            strSel = "select Package,Acc,SubAcc,sum(TotalValueOut)-sum(TotalValueIn) totalvaluein " & _
                     " from transactions" & _
                     " where Done=1 And package = N'" & Me.ComboBox1.SelectedItem & "' group by Package,Acc,SubAcc"

            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim dasAccStatus As New DataSet

            cnn.Open()
            dasAccStatus.Clear()
            dap.Fill(dasAccStatus, "Transactions")
            cnn.Close()

            Dim rpt As New PackDetails
            rpt.SetDataSource(dasAccStatus)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub
End Class
