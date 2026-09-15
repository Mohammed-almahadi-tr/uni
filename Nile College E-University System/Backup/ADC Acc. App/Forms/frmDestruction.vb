Imports System.Data.SqlClient

Public Class frmDestruction
    Inherits System.Windows.Forms.Form

    Sub Clear()
        Me.txtCalPerc.Clear()
    End Sub

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
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents CombAssets As System.Windows.Forms.ComboBox
    Friend WithEvents txtCalPerc As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Button2 As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmDestruction))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.txtCalPerc = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.Label4 = New System.Windows.Forms.Label
        Me.CombAssets = New System.Windows.Forms.ComboBox
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Label7 = New System.Windows.Forms.Label
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox4.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtCalPerc)
        Me.GroupBox1.Controls.Add(Me.Label5)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.CombAssets)
        Me.GroupBox1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox1.Location = New System.Drawing.Point(7, 3)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(277, 79)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'txtCalPerc
        '
        Me.txtCalPerc.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtCalPerc.Location = New System.Drawing.Point(96, 47)
        Me.txtCalPerc.Name = "txtCalPerc"
        Me.txtCalPerc.Size = New System.Drawing.Size(96, 21)
        Me.txtCalPerc.TabIndex = 4
        Me.txtCalPerc.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label5.Location = New System.Drawing.Point(192, 51)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(81, 13)
        Me.Label5.TabIndex = 8
        Me.Label5.Text = "«·ﬁÌ„… «·„Â·ﬂ… :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(194, 23)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(41, 13)
        Me.Label4.TabIndex = 5
        Me.Label4.Text = "«·√’· :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombAssets
        '
        Me.CombAssets.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAssets.DropDownWidth = 186
        Me.CombAssets.FormattingEnabled = True
        Me.CombAssets.Location = New System.Drawing.Point(6, 20)
        Me.CombAssets.Name = "CombAssets"
        Me.CombAssets.Size = New System.Drawing.Size(186, 21)
        Me.CombAssets.TabIndex = 0
        '
        'GroupBox2
        '
        Me.GroupBox2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox2.Location = New System.Drawing.Point(7, 137)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(277, 4)
        Me.GroupBox2.TabIndex = 5
        Me.GroupBox2.TabStop = False
        '
        'Button1
        '
        Me.Button1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button1.Location = New System.Drawing.Point(176, 147)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 1
        Me.Button1.Text = "Õ›Ÿ"
        '
        'Button2
        '
        Me.Button2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button2.Location = New System.Drawing.Point(40, 147)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 2
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'GroupBox4
        '
        Me.GroupBox4.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox4.Controls.Add(Me.Label7)
        Me.GroupBox4.Location = New System.Drawing.Point(7, 84)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(277, 47)
        Me.GroupBox4.TabIndex = 99
        Me.GroupBox4.TabStop = False
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DateTimePicker1.Location = New System.Drawing.Point(6, 16)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(193, 21)
        Me.DateTimePicker1.TabIndex = 94
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label7.Location = New System.Drawing.Point(205, 20)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(60, 13)
        Me.Label7.TabIndex = 93
        Me.Label7.Text = " «—ÌŒ «·ﬁÌœ :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'frmDestruction
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(290, 184)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(298, 218)
        Me.MinimumSize = New System.Drawing.Size(298, 218)
        Me.Name = "frmDestruction"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "≈Â·«ﬂ «·√’Ê· «·À«» …"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub frmDestruction_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim Cmd As New SqlCommand("Select Distinct SubAcc from Acc Where Pack=N'«·√’Ê· «·À«» …' " & _
                                      "and Acc=N'«·√’Ê·' order by SubAcc", cnn)
            Dim Reader As SqlDataReader

            Me.CombAssets.Items.Clear()

            cnn.Open()
            Reader = Cmd.ExecuteReader
            While Reader.Read
                Me.CombAssets.Items.Add(Reader.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.CombAssets.SelectedIndex = -1 Or Len(Me.txtCalPerc.Text) = 0 Then
            MsgBox("«·—Ã«¡ „—«Ã⁄… «·»Ì«‰« ")
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer = GetMoveNo(Me.DateTimePicker1.Value.Year)

                Dim strIns As String
                Dim strIns1 As String

                strIns = "Insert into Transactions (Descr,Package,Acc,SubAcc,TotalValueIn,MoveNo,TransDate) " & _
                         " Values (N'≈Â·«ﬂ',N'«·√’Ê· «·À«» …',N'„Ã„⁄ «·≈Â·«ﬂ',N'„Ã„⁄ ≈Â·«ﬂ " & Me.CombAssets.SelectedItem & _
                         "'," & Me.txtCalPerc.Text & "," & MoveNo & ",N'" & _
                             Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 10:10:10')"

                strIns1 = "Insert into Transactions (Descr,Package,Acc,SubAcc,TotalValueOut,MoveNo,TransDate) " & _
                         " Values (N'≈Â·«ﬂ',N'«·√—»«Õ Ê«·Œ”«∆—',N'«·„’—Ê›« ',N'≈Â·«ﬂ " & Me.CombAssets.SelectedItem & "'," & _
                         Me.txtCalPerc.Text & "," & MoveNo & ",N'" & _
                             Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 10:10:10')"


                Dim cmd As New SqlCommand(strIns, cnn)
                Dim cmd1 As New SqlCommand(strIns1, cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cmd1.ExecuteNonQuery()
                cnn.Close()

                MsgBox(" „ «·Õ›Ÿ")

                PrintVoucher(MoveNo, Me.DateTimePicker1.Value.Year)

                'Restore defaults
                Clear()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.ToString)
                Try
                    cnn.Close()
                Catch

                End Try
            End Try
        End If
    End Sub
End Class
