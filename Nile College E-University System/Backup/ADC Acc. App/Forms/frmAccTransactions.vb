Imports System.Data.SqlClient
Public Class frmAccTransactions
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
    Friend WithEvents ComboBox3 As System.Windows.Forms.ComboBox
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents ComboBox2 As System.Windows.Forms.ComboBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker2 As System.Windows.Forms.DateTimePicker
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmAccTransactions))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.ComboBox3 = New System.Windows.Forms.ComboBox
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.ComboBox2 = New System.Windows.Forms.ComboBox
        Me.Label3 = New System.Windows.Forms.Label
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker2 = New System.Windows.Forms.DateTimePicker
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Label4 = New System.Windows.Forms.Label
        Me.Label5 = New System.Windows.Forms.Label
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.ComboBox3)
        Me.GroupBox1.Controls.Add(Me.ComboBox1)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.ComboBox2)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 8)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(478, 80)
        Me.GroupBox1.TabIndex = 70
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "«·Õ”«»"
        '
        'ComboBox3
        '
        Me.ComboBox3.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox3.DropDownWidth = 250
        Me.ComboBox3.Location = New System.Drawing.Point(8, 48)
        Me.ComboBox3.Name = "ComboBox3"
        Me.ComboBox3.Size = New System.Drawing.Size(152, 21)
        Me.ComboBox3.Sorted = True
        Me.ComboBox3.TabIndex = 71
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.DropDownWidth = 250
        Me.ComboBox1.Location = New System.Drawing.Point(273, 16)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(152, 21)
        Me.ComboBox1.Sorted = True
        Me.ComboBox1.TabIndex = 68
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label2.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label2.Location = New System.Drawing.Point(427, 20)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(44, 13)
        Me.Label2.TabIndex = 67
        Me.Label2.Text = "«·Õ“„… :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label1.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label1.Location = New System.Drawing.Point(162, 20)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(95, 13)
        Me.Label1.TabIndex = 23
        Me.Label1.Text = "«·Õ”«» «·—∆Ì”Ì :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'ComboBox2
        '
        Me.ComboBox2.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox2.DropDownWidth = 250
        Me.ComboBox2.Location = New System.Drawing.Point(8, 16)
        Me.ComboBox2.Name = "ComboBox2"
        Me.ComboBox2.Size = New System.Drawing.Size(152, 21)
        Me.ComboBox2.Sorted = True
        Me.ComboBox2.TabIndex = 70
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label3.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label3.Location = New System.Drawing.Point(162, 52)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(89, 13)
        Me.Label3.TabIndex = 69
        Me.Label3.Text = "«·Õ”«» «·›—⁄Ì :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.DateTimePicker2)
        Me.GroupBox2.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Location = New System.Drawing.Point(6, 88)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(478, 48)
        Me.GroupBox2.TabIndex = 73
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "«·› —…"
        '
        'DateTimePicker2
        '
        Me.DateTimePicker2.Location = New System.Drawing.Point(8, 16)
        Me.DateTimePicker2.Name = "DateTimePicker2"
        Me.DateTimePicker2.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker2.TabIndex = 3
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(245, 16)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker1.TabIndex = 2
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(202, 20)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(31, 13)
        Me.Label4.TabIndex = 1
        Me.Label4.Text = "≈·Ï :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(439, 20)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(28, 13)
        Me.Label5.TabIndex = 0
        Me.Label5.Text = "„‰ :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(281, 152)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 72
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(409, 152)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 71
        Me.Button1.Text = "⁄—÷ "
        '
        'GroupBox3
        '
        Me.GroupBox3.Location = New System.Drawing.Point(6, 138)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(478, 8)
        Me.GroupBox3.TabIndex = 74
        Me.GroupBox3.TabStop = False
        '
        'frmAccTransactions
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(490, 190)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(498, 224)
        Me.MinimumSize = New System.Drawing.Size(498, 224)
        Me.Name = "frmAccTransactions"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "⁄—÷ Õ—ﬂ… Õ”«»"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub frmAccTransactions_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
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

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ComboBox1.SelectedIndexChanged
        Try
            If Me.ComboBox1.SelectedIndex = -1 Then
                Me.ComboBox2.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("SELECT distinct Acc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox2.Items.Clear()
            Me.ComboBox3.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ComboBox2.Items.Add(SqlReader.Item(0))
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

    Private Sub ComboBox2_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ComboBox2.SelectedIndexChanged
        Try
            If Me.ComboBox2.SelectedIndex = -1 Then
                Me.ComboBox3.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("SELECT distinct SubAcc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & Me.ComboBox2.SelectedItem & "' and subacc is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox3.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ComboBox3.Items.Add(SqlReader.Item(0))
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

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.DateTimePicker1.Value > Me.DateTimePicker2.Value Then
            MsgBox("«·—Ã«¡ „—«Ã⁄… «·› —…")
            Exit Sub
        End If

        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ“„…")
            Me.ComboBox1.Focus()
            Exit Sub
        End If

        If Me.ComboBox2.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ”«» «·—∆Ì”Ì")
            Me.ComboBox2.Focus()
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            Dim strSel As String

            If Me.ComboBox3.SelectedIndex <> -1 Then
                strSel = " ( select 0 TransNo,'—’Ìœ √Ê· «·„œ…' Descr,'0' TransType,Package,Acc,SubAcc,0 TotalValueIn,0 TotalValueOut,sum(TotalValueOut)-sum(TotalValueIn) sno,'" & _
                 DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                 "' TransDate from transactions where Package =N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & _
                 Me.ComboBox2.SelectedItem & "' and SubAcc=N'" & Me.ComboBox3.SelectedItem & "' and Done=1 and transdate<N'" & _
                 Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' group by Package,Acc,SubAcc) union all " & _
                 "(select MoveNo TransNo,Descr,ChNo TransType,Package,Acc,SubAcc,TotalValueIn,TotalValueOut,TotalValueOut-TotalValueIn sno,TransDate " & _
                 " from transactions" & _
                 " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                 " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 " & _
                 " and package=N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & Me.ComboBox2.SelectedItem & "' and SubAcc=N'" & Me.ComboBox3.SelectedItem & "') "

            ElseIf Me.ComboBox3.SelectedIndex = -1 Then
                strSel = " ( select 0 TransNo,'—’Ìœ √Ê· «·„œ…' Descr,'0' TransType,Package,Acc,'-' SubAcc,0 TotalValueIn,0 TotalValueOut,sum(TotalValueOut)-sum(TotalValueIn) sno,'" & _
                DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                "' TransDate from transactions where Package=N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & _
                Me.ComboBox2.SelectedItem & "' and Done=1 and transdate<N'" & _
                Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' group by Package,Acc) union all " & _
                "(select MoveNo TransNo,Descr,ChNo TransType,Package,Acc,'-' SubAcc,TotalValueIn,TotalValueOut,TotalValueOut-TotalValueIn sno,TransDate " & _
                " from transactions" & _
                " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 " & _
                " and package=N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & Me.ComboBox2.SelectedItem & "') "
            End If

            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim dasAccStatus As New DataSet

            cnn.Open()
            dasAccStatus.Clear()
            dap.Fill(dasAccStatus, "Transactions")
            cnn.Close()

            Dim rpt As New AccTransActions
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
End Class
